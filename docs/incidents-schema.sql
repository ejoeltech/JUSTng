-- Comprehensive Incidents Database Schema
-- This schema supports the JUST incident reporting system with real-time features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For GIN indexes on arrays

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'super_admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '{}',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT users_email_length CHECK (LENGTH(email) <= 255),
    CONSTRAINT users_full_name_length CHECK (LENGTH(full_name) <= 255),
    CONSTRAINT users_phone_length CHECK (LENGTH(phone) <= 20)
);

-- User profiles table for additional user information
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    location_state VARCHAR(100),
    location_lga VARCHAR(100),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(100),
    notification_preferences JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id)
);

-- Incident categories table
CREATE TABLE IF NOT EXISTS incident_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(7), -- Hex color code
    severity_weight INTEGER DEFAULT 1 CHECK (severity_weight >= 1 AND severity_weight <= 5),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT incident_categories_name_length CHECK (LENGTH(name) <= 100),
    CONSTRAINT incident_categories_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Incidents table (main table)
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES incident_categories(id),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'in_progress', 'resolved', 'closed', 'dismissed')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Location information
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_accuracy DECIMAL(5, 2), -- in meters
    address TEXT,
    state VARCHAR(100),
    lga VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Reporter information
    reporter_id UUID NOT NULL REFERENCES users(id),
    reporter_name VARCHAR(255),
    reporter_phone VARCHAR(20),
    reporter_email VARCHAR(255),
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Incident details
    incident_date TIMESTAMP WITH TIME ZONE,
    reported_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estimated_damage DECIMAL(15, 2), -- in NGN
    affected_people_count INTEGER DEFAULT 0,
    witness_info TEXT,
    police_station VARCHAR(255),
    case_number VARCHAR(100),
    
    -- Media and files
    media_count INTEGER DEFAULT 0,
    has_video BOOLEAN DEFAULT FALSE,
    has_photos BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    tags TEXT[], -- Array of tags
    metadata JSONB DEFAULT '{}',
    flags JSONB DEFAULT '{}', -- For moderation flags
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT incidents_title_length CHECK (LENGTH(title) <= 255),
    CONSTRAINT incidents_latitude_range CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT incidents_longitude_range CHECK (longitude >= -180 AND longitude <= 180),
    CONSTRAINT incidents_accuracy_positive CHECK (location_accuracy > 0),
    CONSTRAINT incidents_damage_positive CHECK (estimated_damage >= 0),
    CONSTRAINT incidents_people_count_positive CHECK (affected_people_count >= 0)
);

-- Incident updates/status changes table
CREATE TABLE IF NOT EXISTS incident_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    update_type VARCHAR(50) NOT NULL CHECK (update_type IN ('status_change', 'comment', 'assignment', 'resolution', 'reopening')),
    old_value TEXT,
    new_value TEXT,
    message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT incident_updates_type_valid CHECK (update_type IN ('status_change', 'comment', 'assignment', 'resolution', 'reopening'))
);

-- Incident assignments table
CREATE TABLE IF NOT EXISTS incident_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES users(id),
    assigned_by UUID NOT NULL REFERENCES users(id),
    assignment_type VARCHAR(50) DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'secondary', 'reviewer', 'investigator')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'reassigned', 'declined')),
    notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT incident_assignments_incident_user_unique UNIQUE (incident_id, assigned_to, assignment_type)
);

-- Incident comments table
CREATE TABLE IF NOT EXISTS incident_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    parent_comment_id UUID REFERENCES incident_comments(id) ON DELETE CASCADE, -- For threaded comments
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes vs public comments
    is_resolved BOOLEAN DEFAULT FALSE, -- Mark as resolved
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT incident_comments_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- Incident files table (extends the existing incident_files table)
CREATE TABLE IF NOT EXISTS incident_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64),
    thumbnail_url TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    CONSTRAINT incident_files_size_check CHECK (file_size > 0 AND file_size <= 10485760), -- 10MB max
    CONSTRAINT incident_files_filename_length CHECK (LENGTH(filename) <= 255),
    CONSTRAINT incident_files_original_filename_length CHECK (LENGTH(original_filename) <= 255)
);

-- Incident statistics table for caching aggregated data
CREATE TABLE IF NOT EXISTS incident_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stat_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
    stat_date DATE NOT NULL,
    stat_period VARCHAR(20) NOT NULL, -- '2024-01-01', '2024-W01', '2024-01', '2024'
    
    -- Counts
    total_incidents INTEGER DEFAULT 0,
    new_incidents INTEGER DEFAULT 0,
    resolved_incidents INTEGER DEFAULT 0,
    closed_incidents INTEGER DEFAULT 0,
    
    -- Severity breakdown
    low_severity_count INTEGER DEFAULT 0,
    medium_severity_count INTEGER DEFAULT 0,
    high_severity_count INTEGER DEFAULT 0,
    critical_severity_count INTEGER DEFAULT 0,
    
    -- Status breakdown
    reported_count INTEGER DEFAULT 0,
    investigating_count INTEGER DEFAULT 0,
    in_progress_count INTEGER DEFAULT 0,
    resolved_count INTEGER DEFAULT 0,
    closed_count INTEGER DEFAULT 0,
    dismissed_count INTEGER DEFAULT 0,
    
    -- Category breakdown
    category_breakdown JSONB DEFAULT '{}',
    
    -- Location breakdown
    state_breakdown JSONB DEFAULT '{}',
    lga_breakdown JSONB DEFAULT '{}',
    
    -- Response metrics
    avg_response_time DECIMAL(10, 2), -- in hours
    avg_resolution_time DECIMAL(10, 2), -- in hours
    resolution_rate DECIMAL(5, 2), -- percentage
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT incident_statistics_type_date_unique UNIQUE (stat_type, stat_date),
    CONSTRAINT incident_statistics_counts_positive CHECK (
        total_incidents >= 0 AND new_incidents >= 0 AND resolved_incidents >= 0 AND closed_incidents >= 0
    )
);

-- Audit log table for tracking all changes
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    user_id UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Search index table for full-text search
CREATE TABLE IF NOT EXISTS incident_search_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    search_vector tsvector NOT NULL,
    title_vector tsvector NOT NULL,
    description_vector tsvector NOT NULL,
    tags_vector tsvector NOT NULL,
    address_vector tsvector NOT NULL,
    last_indexed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT incident_search_index_incident_unique UNIQUE (incident_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_reporter_id ON incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_category_id ON incidents(category_id);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_incident_date ON incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX IF NOT EXISTS idx_incidents_state_lga ON incidents(state, lga);
CREATE INDEX IF NOT EXISTS idx_incidents_tags ON incidents USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_incidents_metadata ON incidents USING GIN (metadata);

-- Spatial index for location-based queries
CREATE INDEX IF NOT EXISTS idx_incidents_location_spatial ON incidents USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_incidents_title_search ON incidents USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_incidents_description_search ON incidents USING GIN (to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_incidents_address_search ON incidents USING GIN (to_tsvector('english', address));

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_incidents_status_severity ON incidents(status, severity);
CREATE INDEX IF NOT EXISTS idx_incidents_state_status ON incidents(state, status);
CREATE INDEX IF NOT EXISTS idx_incidents_date_status ON incidents(created_at, status);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter_date ON incidents(reporter_id, created_at);

-- Indexes for other tables
CREATE INDEX IF NOT EXISTS idx_incident_updates_incident_id ON incident_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_updates_user_id ON incident_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_incident_updates_created_at ON incident_updates(created_at);

CREATE INDEX IF NOT EXISTS idx_incident_assignments_incident_id ON incident_assignments(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_assignments_assigned_to ON incident_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incident_assignments_status ON incident_assignments(status);

CREATE INDEX IF NOT EXISTS idx_incident_comments_incident_id ON incident_comments(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_comments_user_id ON incident_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_incident_comments_parent_id ON incident_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_incident_comments_created_at ON incident_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_incident_files_incident_id ON incident_files(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_files_uploaded_by ON incident_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_incident_files_mime_type ON incident_files(mime_type);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON audit_log(operation);

-- Search index
CREATE INDEX IF NOT EXISTS idx_incident_search_vector ON incident_search_index USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_incident_search_title ON incident_search_index USING GIN (title_vector);
CREATE INDEX IF NOT EXISTS idx_incident_search_description ON incident_search_index USING GIN (description_vector);
CREATE INDEX IF NOT EXISTS idx_incident_search_tags ON incident_search_index USING GIN (tags_vector);
CREATE INDEX IF NOT EXISTS idx_incident_search_address ON incident_search_index USING GIN (address_vector);

-- Functions for maintaining search index
CREATE OR REPLACE FUNCTION update_incident_search_index()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM incident_search_index WHERE incident_id = OLD.id;
        RETURN OLD;
    END IF;
    
    INSERT INTO incident_search_index (incident_id, search_vector, title_vector, description_vector, tags_vector, address_vector)
    VALUES (
        NEW.id,
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.address, '')), 'D'),
        to_tsvector('english', COALESCE(NEW.title, '')),
        to_tsvector('english', COALESCE(NEW.description, '')),
        to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')),
        to_tsvector('english', COALESCE(NEW.address, ''))
    )
    ON CONFLICT (incident_id) DO UPDATE SET
        search_vector = EXCLUDED.search_vector,
        title_vector = EXCLUDED.title_vector,
        description_vector = EXCLUDED.description_vector,
        tags_vector = EXCLUDED.tags_vector,
        address_vector = EXCLUDED.address_vector,
        last_indexed = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for maintaining search index
CREATE TRIGGER trigger_update_incident_search_index
    AFTER INSERT OR UPDATE OR DELETE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_incident_search_index();

-- Function to update incident statistics
CREATE OR REPLACE FUNCTION update_incident_statistics()
RETURNS TRIGGER AS $$
DECLARE
    stat_date DATE;
    stat_period VARCHAR(20);
BEGIN
    -- Determine stat period based on incident date or created date
    IF NEW.incident_date IS NOT NULL THEN
        stat_date := DATE(NEW.incident_date);
    ELSE
        stat_date := DATE(NEW.created_at);
    END IF;
    
    stat_period := stat_date::VARCHAR(10);
    
    -- Insert or update daily statistics
    INSERT INTO incident_statistics (
        stat_type, stat_date, stat_period,
        total_incidents, new_incidents,
        low_severity_count, medium_severity_count, high_severity_count, critical_severity_count,
        reported_count, investigating_count, in_progress_count, resolved_count, closed_count, dismissed_count
    )
    VALUES (
        'daily', stat_date, stat_period,
        1, 1,
        CASE WHEN NEW.severity = 'low' THEN 1 ELSE 0 END,
        CASE WHEN NEW.severity = 'medium' THEN 1 ELSE 0 END,
        CASE WHEN NEW.severity = 'high' THEN 1 ELSE 0 END,
        CASE WHEN NEW.severity = 'critical' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'reported' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'investigating' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'in_progress' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'resolved' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'closed' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'dismissed' THEN 1 ELSE 0 END
    )
    ON CONFLICT (stat_type, stat_date) DO UPDATE SET
        total_incidents = incident_statistics.total_incidents + 1,
        new_incidents = incident_statistics.new_incidents + 1,
        low_severity_count = incident_statistics.low_severity_count + CASE WHEN NEW.severity = 'low' THEN 1 ELSE 0 END,
        medium_severity_count = incident_statistics.medium_severity_count + CASE WHEN NEW.severity = 'medium' THEN 1 ELSE 0 END,
        high_severity_count = incident_statistics.high_severity_count + CASE WHEN NEW.severity = 'high' THEN 1 ELSE 0 END,
        critical_severity_count = incident_statistics.critical_severity_count + CASE WHEN NEW.severity = 'critical' THEN 1 ELSE 0 END,
        reported_count = incident_statistics.reported_count + CASE WHEN NEW.status = 'reported' THEN 1 ELSE 0 END,
        investigating_count = incident_statistics.investigating_count + CASE WHEN NEW.status = 'investigating' THEN 1 ELSE 0 END,
        in_progress_count = incident_statistics.in_progress_count + CASE WHEN NEW.status = 'in_progress' THEN 1 ELSE 0 END,
        resolved_count = incident_statistics.resolved_count + CASE WHEN NEW.status = 'resolved' THEN 1 ELSE 0 END,
        closed_count = incident_statistics.closed_count + CASE WHEN NEW.status = 'closed' THEN 1 ELSE 0 END,
        dismissed_count = incident_statistics.dismissed_count + CASE WHEN NEW.status = 'dismissed' THEN 1 ELSE 0 END,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating statistics
CREATE TRIGGER trigger_update_incident_statistics
    AFTER INSERT ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_incident_statistics();

-- Function to get nearby incidents
CREATE OR REPLACE FUNCTION get_nearby_incidents(
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    radius_meters INTEGER DEFAULT 5000,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    severity VARCHAR(20),
    status VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    distance_meters DECIMAL(10, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.title,
        i.description,
        i.severity,
        i.status,
        i.latitude,
        i.longitude,
        i.address,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(i.longitude, i.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        ) AS distance_meters
    FROM incidents i
    WHERE i.latitude IS NOT NULL 
        AND i.longitude IS NOT NULL
        AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(i.longitude, i.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_meters
        )
    ORDER BY distance_meters
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search incidents
CREATE OR REPLACE FUNCTION search_incidents(
    search_query TEXT,
    filters JSONB DEFAULT '{}',
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    severity VARCHAR(20),
    status VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    relevance_score REAL
) AS $$
DECLARE
    severity_filter VARCHAR(20);
    status_filter VARCHAR(20);
    state_filter VARCHAR(100);
    category_filter UUID;
BEGIN
    -- Extract filters
    severity_filter := COALESCE(filters->>'severity', NULL);
    status_filter := COALESCE(filters->>'status', NULL);
    state_filter := COALESCE(filters->>'state', NULL);
    category_filter := COALESCE((filters->>'category_id')::UUID, NULL);
    
    RETURN QUERY
    SELECT 
        i.id,
        i.title,
        i.description,
        i.severity,
        i.status,
        i.created_at,
        ts_rank_cd(isi.search_vector, plainto_tsquery('english', search_query)) AS relevance_score
    FROM incidents i
    JOIN incident_search_index isi ON i.id = isi.incident_id
    WHERE (
        isi.search_vector @@ plainto_tsquery('english', search_query)
        OR i.title ILIKE '%' || search_query || '%'
        OR i.description ILIKE '%' || search_query || '%'
        OR i.address ILIKE '%' || search_query || '%'
    )
    AND (severity_filter IS NULL OR i.severity = severity_filter)
    AND (status_filter IS NULL OR i.status = status_filter)
    AND (state_filter IS NULL OR i.state = state_filter)
    AND (category_filter IS NULL OR i.category_id = category_filter)
    ORDER BY relevance_score DESC, i.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Insert initial data
INSERT INTO incident_categories (name, description, icon, color, severity_weight, sort_order) VALUES
('Theft', 'Theft and burglary incidents', 'theft', '#EF4444', 3, 1),
('Assault', 'Physical assault and violence', 'assault', '#DC2626', 5, 2),
('Fraud', 'Financial fraud and scams', 'fraud', '#F59E0B', 4, 3),
('Vandalism', 'Property damage and vandalism', 'vandalism', '#F97316', 2, 4),
('Traffic', 'Traffic accidents and violations', 'traffic', '#10B981', 3, 5),
('Harassment', 'Harassment and intimidation', 'harassment', '#8B5CF6', 4, 6),
('Other', 'Other types of incidents', 'other', '#6B7280', 1, 7)
ON CONFLICT (name) DO NOTHING;

-- Create views for common queries
CREATE OR REPLACE VIEW incidents_with_details AS
SELECT 
    i.*,
    ic.name as category_name,
    ic.color as category_color,
    u.full_name as reporter_full_name,
    u.email as reporter_email,
    up.location_state as reporter_state,
    up.location_lga as reporter_lga
FROM incidents i
LEFT JOIN incident_categories ic ON i.category_id = ic.id
LEFT JOIN users u ON i.reporter_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id;

CREATE OR REPLACE VIEW incidents_by_location AS
SELECT 
    state,
    lga,
    COUNT(*) as incident_count,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_count,
    AVG(CASE WHEN severity = 'low' THEN 1 WHEN severity = 'medium' THEN 2 WHEN severity = 'high' THEN 3 WHEN severity = 'critical' THEN 4 END) as avg_severity
FROM incidents
WHERE state IS NOT NULL AND lga IS NOT NULL
GROUP BY state, lga
ORDER BY incident_count DESC;

-- Grant permissions (adjust based on your Supabase setup)
-- GRANT USAGE ON SCHEMA public TO anon, authenticated;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Enable Row Level Security (RLS)
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (customize based on your requirements)
CREATE POLICY "Users can view public incidents" ON incidents
    FOR SELECT USING (true);

CREATE POLICY "Users can create incidents" ON incidents
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can update their own incidents" ON incidents
    FOR UPDATE USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can update all incidents" ON incidents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- Comments for documentation
COMMENT ON TABLE incidents IS 'Main table for storing incident reports';
COMMENT ON TABLE incident_categories IS 'Categories and types of incidents';
COMMENT ON TABLE incident_updates IS 'Track all changes and updates to incidents';
COMMENT ON TABLE incident_assignments IS 'Track who is assigned to handle incidents';
COMMENT ON TABLE incident_comments IS 'Comments and notes on incidents';
COMMENT ON TABLE incident_files IS 'Files and media associated with incidents';
COMMENT ON TABLE incident_statistics IS 'Cached statistics for performance';
COMMENT ON TABLE audit_log IS 'Audit trail for all database changes';
COMMENT ON TABLE incident_search_index IS 'Full-text search index for incidents';

COMMENT ON FUNCTION get_nearby_incidents IS 'Find incidents within a specified radius of given coordinates';
COMMENT ON FUNCTION search_incidents IS 'Search incidents with full-text search and filters';
COMMENT ON FUNCTION update_incident_search_index IS 'Maintain search index when incidents are modified';
COMMENT ON FUNCTION update_incident_statistics IS 'Update statistics when incidents are created';
