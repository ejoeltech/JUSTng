-- JUST Application Database Schema
-- This file contains all the necessary tables and configurations for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nigerian States Table
CREATE TABLE IF NOT EXISTS states (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    capital TEXT,
    region TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nigerian LGAs Table
CREATE TABLE IF NOT EXISTS lgas (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    state_id INTEGER REFERENCES states(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, state_id)
);

-- Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'resolved', 'closed')),
    
    -- Location Information
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    state_id INTEGER REFERENCES states(id),
    lga_id INTEGER REFERENCES lgas(id),
    address TEXT,
    
    -- Media Files
    photos TEXT[], -- Array of photo URLs
    videos TEXT[], -- Array of video URLs
    live_stream_url TEXT,
    
    -- Metadata
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES user_profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incident Updates Table
CREATE TABLE IF NOT EXISTS incident_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    update_type TEXT NOT NULL CHECK (update_type IN ('comment', 'status_change', 'evidence_added', 'verification')),
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Live Streams Table
CREATE TABLE IF NOT EXISTS live_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    stream_key TEXT NOT NULL,
    stream_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    viewer_count INTEGER DEFAULT 0,
    metadata JSONB
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    related_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES user_profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance Mode Table
CREATE TABLE IF NOT EXISTS maintenance_mode (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT FALSE,
    message TEXT,
    enabled_by UUID REFERENCES user_profiles(id),
    enabled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    disabled_at TIMESTAMP WITH TIME ZONE
);

-- Offline Reports Queue Table
CREATE TABLE IF NOT EXISTS offline_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    incident_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));
CREATE INDEX IF NOT EXISTS idx_incidents_state_lga ON incidents(state_id, lga_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_live_streams_incident_id ON live_streams(incident_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_is_active ON live_streams(is_active);

-- Create RLS (Row Level Security) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_mode ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_reports ENABLE ROW LEVEL SECURITY;

-- User Profiles RLS Policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- Incidents RLS Policies
CREATE POLICY "Users can view all incidents" ON incidents
    FOR SELECT USING (true);

CREATE POLICY "Users can create incidents" ON incidents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incidents" ON incidents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all incidents" ON incidents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

-- Notifications RLS Policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- App Settings RLS Policies
CREATE POLICY "Public settings are viewable by all" ON app_settings
    FOR SELECT USING (is_public = true);

CREATE POLICY "Only superadmins can manage settings" ON app_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'superadmin'
        )
    );

-- Maintenance Mode RLS Policies
CREATE POLICY "Maintenance mode is viewable by all" ON maintenance_mode
    FOR SELECT USING (true);

CREATE POLICY "Only superadmins can manage maintenance mode" ON maintenance_mode
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'superadmin'
        )
    );

-- Insert default Nigerian states
INSERT INTO states (name, code, capital, region) VALUES
('Abia', 'AB', 'Umuahia', 'South East'),
('Adamawa', 'AD', 'Yola', 'North East'),
('Akwa Ibom', 'AK', 'Uyo', 'South South'),
('Anambra', 'AN', 'Awka', 'South East'),
('Bauchi', 'BA', 'Bauchi', 'North East'),
('Bayelsa', 'BY', 'Yenagoa', 'South South'),
('Benue', 'BE', 'Makurdi', 'North Central'),
('Borno', 'BO', 'Maiduguri', 'North East'),
('Cross River', 'CR', 'Calabar', 'South South'),
('Delta', 'DE', 'Asaba', 'South South'),
('Ebonyi', 'EB', 'Abakaliki', 'South East'),
('Edo', 'ED', 'Benin City', 'South South'),
('Ekiti', 'EK', 'Ado Ekiti', 'South West'),
('Enugu', 'EN', 'Enugu', 'South East'),
('Federal Capital Territory', 'FC', 'Abuja', 'North Central'),
('Gombe', 'GO', 'Gombe', 'North East'),
('Imo', 'IM', 'Owerri', 'South East'),
('Jigawa', 'JI', 'Dutse', 'North West'),
('Kaduna', 'KD', 'Kaduna', 'North West'),
('Kano', 'KN', 'Kano', 'North West'),
('Katsina', 'KT', 'Katsina', 'North West'),
('Kebbi', 'KE', 'Birnin Kebbi', 'North West'),
('Kogi', 'KO', 'Lokoja', 'North Central'),
('Kwara', 'KW', 'Ilorin', 'North Central'),
('Lagos', 'LA', 'Ikeja', 'South West'),
('Nasarawa', 'NA', 'Lafia', 'North Central'),
('Niger', 'NI', 'Minna', 'North Central'),
('Ogun', 'OG', 'Abeokuta', 'South West'),
('Ondo', 'ON', 'Akure', 'South West'),
('Osun', 'OS', 'Oshogbo', 'South West'),
('Oyo', 'OY', 'Ibadan', 'South West'),
('Plateau', 'PL', 'Jos', 'North Central'),
('Rivers', 'RI', 'Port Harcourt', 'South South'),
('Sokoto', 'SO', 'Sokoto', 'North West'),
('Taraba', 'TA', 'Jalingo', 'North East'),
('Yobe', 'YO', 'Damaturu', 'North East'),
('Zamfara', 'ZA', 'Gusau', 'North West')
ON CONFLICT (code) DO NOTHING;

-- Insert default app settings
INSERT INTO app_settings (key, value, description, is_public) VALUES
('app_name', 'JUST', 'Application name', true),
('app_version', '1.0.0', 'Application version', true),
('maintenance_mode', 'false', 'Maintenance mode status', true),
('max_file_size', '100mb', 'Maximum file upload size', true),
('max_video_duration', '300', 'Maximum video duration in seconds', true),
('enable_live_streaming', 'true', 'Enable live video streaming', true),
('enable_offline_mode', 'true', 'Enable offline functionality', true)
ON CONFLICT (key) DO NOTHING;

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at 
    BEFORE UPDATE ON incidents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get nearby incidents
CREATE OR REPLACE FUNCTION get_nearby_incidents(
    lat DECIMAL,
    lng DECIMAL,
    radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    incident_type TEXT,
    severity TEXT,
    status TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_meters DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.title,
        i.description,
        i.incident_type,
        i.severity,
        i.status,
        i.latitude,
        i.longitude,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(i.longitude, i.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        ) as distance_meters
    FROM incidents i
    WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(i.longitude, i.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
        radius_meters
    )
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;
