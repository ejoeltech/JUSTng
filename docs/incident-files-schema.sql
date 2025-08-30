-- Incident Files Database Schema
-- This schema handles file uploads, metadata, and storage management for incident evidence

-- Create incident_files table
CREATE TABLE IF NOT EXISTS incident_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64), -- SHA-256 hash for integrity verification
    thumbnail_url TEXT, -- For video files
    uploaded_by UUID NOT NULL REFERENCES users(id),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    metadata JSONB, -- Additional file metadata (dimensions, duration, etc.)
    
    -- Constraints
    CONSTRAINT incident_files_size_check CHECK (file_size > 0 AND file_size <= 10485760), -- 10MB max
    CONSTRAINT incident_files_filename_length CHECK (LENGTH(filename) <= 255),
    CONSTRAINT incident_files_original_filename_length CHECK (LENGTH(original_filename) <= 255)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incident_files_incident_id ON incident_files(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_files_uploaded_by ON incident_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_incident_files_upload_date ON incident_files(upload_date);
CREATE INDEX IF NOT EXISTS idx_incident_files_mime_type ON incident_files(mime_type);
CREATE INDEX IF NOT EXISTS idx_incident_files_is_deleted ON incident_files(is_deleted);
CREATE INDEX IF NOT EXISTS idx_incident_files_file_hash ON incident_files(file_hash);

-- Create unique constraint on file_path to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_files_file_path ON incident_files(file_path) WHERE NOT is_deleted;

-- Create incident_files_audit table for tracking changes
CREATE TABLE IF NOT EXISTS incident_files_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES incident_files(id),
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'restored'
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    old_values JSONB, -- Previous values before change
    new_values JSONB, -- New values after change
    change_reason TEXT -- Reason for the change
);

-- Create indexes for audit table
CREATE INDEX IF NOT EXISTS idx_incident_files_audit_file_id ON incident_files_audit(file_id);
CREATE INDEX IF NOT EXISTS idx_incident_files_audit_changed_at ON incident_files_audit(changed_at);
CREATE INDEX IF NOT EXISTS idx_incident_files_audit_action ON incident_files_audit(action);

-- Create file_storage_stats table for monitoring storage usage
CREATE TABLE IF NOT EXISTS file_storage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_files BIGINT NOT NULL DEFAULT 0,
    total_size BIGINT NOT NULL DEFAULT 0, -- in bytes
    total_incidents BIGINT NOT NULL DEFAULT 0,
    files_by_type JSONB NOT NULL DEFAULT '{}', -- Count by MIME type
    storage_cost DECIMAL(10,4) DEFAULT 0, -- Estimated storage cost
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per day
    UNIQUE(date)
);

-- Create index for storage stats
CREATE INDEX IF NOT EXISTS idx_file_storage_stats_date ON file_storage_stats(date);

-- Create file_cleanup_log table for tracking cleanup operations
CREATE TABLE IF NOT EXISTS file_cleanup_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cleanup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cleanup_type VARCHAR(50) NOT NULL, -- 'scheduled', 'manual', 'storage_limit'
    files_deleted BIGINT NOT NULL DEFAULT 0,
    space_freed BIGINT NOT NULL DEFAULT 0, -- in bytes
    cleanup_criteria JSONB, -- Criteria used for cleanup
    executed_by UUID REFERENCES users(id),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    execution_time_ms INTEGER -- Execution time in milliseconds
);

-- Create index for cleanup log
CREATE INDEX IF NOT EXISTS idx_file_cleanup_log_date ON file_cleanup_log(cleanup_date);
CREATE INDEX IF NOT EXISTS idx_file_cleanup_log_type ON file_cleanup_log(cleanup_type);

-- Add media_count column to incidents table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incidents' AND column_name = 'media_count'
    ) THEN
        ALTER TABLE incidents ADD COLUMN media_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create function to update media count when files are added/removed
CREATE OR REPLACE FUNCTION update_incident_media_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE incidents 
        SET media_count = media_count + 1,
            updated_at = NOW()
        WHERE id = NEW.incident_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE incidents 
        SET media_count = GREATEST(media_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.incident_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic media count updates
DROP TRIGGER IF EXISTS trigger_update_incident_media_count ON incident_files;
CREATE TRIGGER trigger_update_incident_media_count
    AFTER INSERT OR DELETE ON incident_files
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_media_count();

-- Create function to calculate file hash
CREATE OR REPLACE FUNCTION calculate_file_hash(file_content BYTEA)
RETURNS VARCHAR(64) AS $$
BEGIN
    -- This is a placeholder - in production, use proper cryptographic hash
    -- For now, return a simple hash based on content length and first few bytes
    RETURN encode(sha256(file_content), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create function to get storage usage by user
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_uuid UUID)
RETURNS TABLE(
    total_files BIGINT,
    total_size BIGINT,
    total_size_mb DECIMAL(10,2),
    files_by_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_files,
        COALESCE(SUM(file_size), 0)::BIGINT as total_size,
        ROUND(COALESCE(SUM(file_size), 0) / 1048576.0, 2) as total_size_mb,
        jsonb_object_agg(mime_type, COUNT(*)) as files_by_type
    FROM incident_files 
    WHERE uploaded_by = user_uuid AND NOT is_deleted
    GROUP BY uploaded_by;
END;
$$ LANGUAGE plpgsql;

-- Create function to get incident storage usage
CREATE OR REPLACE FUNCTION get_incident_storage_usage(incident_uuid UUID)
RETURNS TABLE(
    total_files BIGINT,
    total_size BIGINT,
    total_size_mb DECIMAL(10,2),
    files_by_type JSONB,
    file_details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_files,
        COALESCE(SUM(file_size), 0)::BIGINT as total_size,
        ROUND(COALESCE(SUM(file_size), 0) / 1048576.0, 2) as total_size_mb,
        jsonb_object_agg(mime_type, COUNT(*)) as files_by_type,
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'filename', original_filename,
                'size', file_size,
                'type', mime_type,
                'url', public_url,
                'upload_date', upload_date
            )
        ) as file_details
    FROM incident_files 
    WHERE incident_id = incident_uuid AND NOT is_deleted
    GROUP BY incident_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to cleanup old files
CREATE OR REPLACE FUNCTION cleanup_old_files(
    days_old INTEGER DEFAULT 30,
    max_size_mb INTEGER DEFAULT 1000
)
RETURNS TABLE(
    files_deleted BIGINT,
    space_freed BIGINT,
    space_freed_mb DECIMAL(10,2)
) AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
    deleted_count BIGINT := 0;
    freed_space BIGINT := 0;
    cleanup_record RECORD;
BEGIN
    -- Calculate cutoff date
    cutoff_date := NOW() - INTERVAL '1 day' * days_old;
    
    -- Get files to delete
    FOR cleanup_record IN 
        SELECT id, file_path, file_size 
        FROM incident_files 
        WHERE upload_date < cutoff_date 
        AND NOT is_deleted
        ORDER BY upload_date ASC
    LOOP
        -- Mark as deleted
        UPDATE incident_files 
        SET is_deleted = TRUE, 
            deleted_at = NOW()
        WHERE id = cleanup_record.id;
        
        deleted_count := deleted_count + 1;
        freed_space := freed_space + cleanup_record.file_size;
        
        -- Log the deletion
        INSERT INTO incident_files_audit (
            file_id, action, changed_by, change_reason
        ) VALUES (
            cleanup_record.id, 'deleted', 
            (SELECT id FROM users WHERE role = 'system' LIMIT 1),
            'Automatic cleanup: file older than ' || days_old || ' days'
        );
        
        -- Check if we've freed enough space
        IF freed_space >= (max_size_mb * 1048576) THEN
            EXIT;
        END IF;
    END LOOP;
    
    -- Log cleanup operation
    INSERT INTO file_cleanup_log (
        cleanup_type, files_deleted, space_freed, cleanup_criteria
    ) VALUES (
        'scheduled', deleted_count, freed_space,
        jsonb_build_object('days_old', days_old, 'max_size_mb', max_size_mb)
    );
    
    RETURN QUERY SELECT 
        deleted_count,
        freed_space,
        ROUND(freed_space / 1048576.0, 2);
END;
$$ LANGUAGE plpgsql;

-- Create view for file statistics
CREATE OR REPLACE VIEW file_statistics AS
SELECT 
    DATE_TRUNC('day', upload_date) as date,
    COUNT(*) as files_uploaded,
    SUM(file_size) as total_size_bytes,
    ROUND(SUM(file_size) / 1048576.0, 2) as total_size_mb,
    COUNT(DISTINCT incident_id) as incidents_with_files,
    COUNT(DISTINCT uploaded_by) as unique_uploaders,
    jsonb_object_agg(mime_type, COUNT(*)) as files_by_type
FROM incident_files 
WHERE NOT is_deleted
GROUP BY DATE_TRUNC('day', upload_date)
ORDER BY date DESC;

-- Create view for storage usage by incident
CREATE OR REPLACE VIEW incident_storage_usage AS
SELECT 
    i.id as incident_id,
    i.title as incident_title,
    i.incident_date,
    COUNT(f.id) as file_count,
    COALESCE(SUM(f.file_size), 0) as total_size_bytes,
    ROUND(COALESCE(SUM(f.file_size), 0) / 1048576.0, 2) as total_size_mb,
    jsonb_object_agg(f.mime_type, COUNT(*)) as files_by_type
FROM incidents i
LEFT JOIN incident_files f ON i.id = f.incident_id AND NOT f.is_deleted
GROUP BY i.id, i.title, i.incident_date
ORDER BY total_size_bytes DESC NULLS LAST;

-- Insert initial storage stats record
INSERT INTO file_storage_stats (date, total_files, total_size, total_incidents)
VALUES (CURRENT_DATE, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON incident_files TO authenticated_users;
-- GRANT SELECT ON file_statistics TO authenticated_users;
-- GRANT SELECT ON incident_storage_usage TO authenticated_users;

-- Comments for documentation
COMMENT ON TABLE incident_files IS 'Stores metadata for files uploaded as incident evidence';
COMMENT ON TABLE incident_files_audit IS 'Audit trail for all changes to incident files';
COMMENT ON TABLE file_storage_stats IS 'Daily storage usage statistics';
COMMENT ON TABLE file_cleanup_log IS 'Log of file cleanup operations';

COMMENT ON COLUMN incident_files.file_hash IS 'SHA-256 hash for file integrity verification';
COMMENT ON COLUMN incident_files.metadata IS 'Additional file metadata (dimensions, duration, etc.)';
COMMENT ON COLUMN incident_files.thumbnail_url IS 'URL to video thumbnail if applicable';
COMMENT ON COLUMN incident_files.is_deleted IS 'Soft delete flag - file marked as deleted but not physically removed';
