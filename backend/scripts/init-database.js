const { dbHelpers } = require('../config/supabase')

async function initializeDatabase() {
  console.log('🚀 Initializing JUST Database...')

  try {
    // Enable required extensions
    console.log('📦 Enabling extensions...')
    await dbHelpers.executeSQL('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    await dbHelpers.executeSQL('CREATE EXTENSION IF NOT EXISTS "postgis"')
    console.log('✅ Extensions enabled')

    // Create tables
    console.log('🏗️ Creating tables...')
    
    // User Profiles table
    await dbHelpers.executeSQL(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // States table
    await dbHelpers.executeSQL(`
      CREATE TABLE IF NOT EXISTS states (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(10) NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // LGAs table
    await dbHelpers.executeSQL(`
      CREATE TABLE IF NOT EXISTS lgas (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        state_id INTEGER REFERENCES states(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(name, state_id)
      )
    `)

    // Incidents table
    await dbHelpers.executeSQL(`
      CREATE TABLE IF NOT EXISTS incidents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        incident_type VARCHAR(100) NOT NULL CHECK (incident_type IN ('harassment', 'assault', 'extortion', 'unlawful_arrest', 'other')),
        severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        status VARCHAR(50) DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'resolved', 'closed')),
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        address TEXT,
        incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
        is_anonymous BOOLEAN DEFAULT FALSE,
        assigned_officer UUID REFERENCES user_profiles(id),
        location GEOMETRY(POINT, 4326),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Incident Updates table
    await dbHelpers.executeSQL(`
      CREATE TABLE IF NOT EXISTS incident_updates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        notes TEXT,
        updated_by UUID REFERENCES user_profiles(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Media Files table
    await dbHelpers.executeSQL(`
      CREATE TABLE IF NOT EXISTS media_files (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Live Streams table
    await dbHelpers.executeSQL(`
      CREATE TABLE IF NOT EXISTS live_streams (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
        stream_key VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'failed')),
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ended_at TIMESTAMP WITH TIME ZONE,
        viewer_count INTEGER DEFAULT 0,
        recording_url TEXT
      )
    `)

    // Notifications table
    await dbHelpers.executeSQL(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // App Settings table
    await dbHelpers.executeSQL(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        maintenance_mode BOOLEAN DEFAULT FALSE,
        maintenance_message TEXT,
        max_file_size BIGINT DEFAULT 104857600,
        allowed_file_types TEXT[] DEFAULT ARRAY['image/*', 'video/*', 'audio/*'],
        notification_enabled BOOLEAN DEFAULT TRUE,
        auto_backup_enabled BOOLEAN DEFAULT TRUE,
        backup_frequency VARCHAR(50) DEFAULT 'daily',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Maintenance Mode table
    await dbHelpers.executeSQL(`
      CREATE TABLE IF NOT EXISTS maintenance_mode (
        id SERIAL PRIMARY KEY,
        enabled BOOLEAN DEFAULT FALSE,
        message TEXT,
        started_at TIMESTAMP WITH TIME ZONE,
        ended_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Offline Reports table
    await dbHelpers.executeSQL(`
      CREATE TABLE IF NOT EXISTS offline_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
        report_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE
      )
    `)

    console.log('✅ Tables created')

    // Create indexes for performance
    console.log('📊 Creating indexes...')
    
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents(user_id)')
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)')
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity)')
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at)')
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST(location)')
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_incident_updates_incident_id ON incident_updates(incident_id)')
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_media_files_incident_id ON media_files(incident_id)')
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)')
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)')
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role)')
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status)')
    
    console.log('✅ Indexes created')

    // Create PostGIS spatial index
    console.log('🗺️ Creating spatial indexes...')
    await dbHelpers.executeSQL('CREATE INDEX IF NOT EXISTS idx_incidents_location_spatial ON incidents USING GIST(location)')
    console.log('✅ Spatial indexes created')

    // Insert initial data
    console.log('📝 Inserting initial data...')
    
    // Insert Nigerian states
    const states = [
      { name: 'Abia', code: 'AB' },
      { name: 'Adamawa', code: 'AD' },
      { name: 'Akwa Ibom', code: 'AK' },
      { name: 'Anambra', code: 'AN' },
      { name: 'Bauchi', code: 'BA' },
      { name: 'Bayelsa', code: 'BY' },
      { name: 'Benue', code: 'BE' },
      { name: 'Borno', code: 'BO' },
      { name: 'Cross River', code: 'CR' },
      { name: 'Delta', code: 'DE' },
      { name: 'Ebonyi', code: 'EB' },
      { name: 'Edo', code: 'ED' },
      { name: 'Ekiti', code: 'EK' },
      { name: 'Enugu', code: 'EN' },
      { name: 'Federal Capital Territory', code: 'FC' },
      { name: 'Gombe', code: 'GO' },
      { name: 'Imo', code: 'IM' },
      { name: 'Jigawa', code: 'JI' },
      { name: 'Kaduna', code: 'KD' },
      { name: 'Kano', code: 'KN' },
      { name: 'Katsina', code: 'KT' },
      { name: 'Kebbi', code: 'KE' },
      { name: 'Kogi', code: 'KO' },
      { name: 'Kwara', code: 'KW' },
      { name: 'Lagos', code: 'LA' },
      { name: 'Nasarawa', code: 'NA' },
      { name: 'Niger', code: 'NI' },
      { name: 'Ogun', code: 'OG' },
      { name: 'Ondo', code: 'ON' },
      { name: 'Osun', code: 'OS' },
      { name: 'Oyo', code: 'OY' },
      { name: 'Plateau', code: 'PL' },
      { name: 'Rivers', code: 'RI' },
      { name: 'Sokoto', code: 'SO' },
      { name: 'Taraba', code: 'TA' },
      { name: 'Yobe', code: 'YO' },
      { name: 'Zamfara', code: 'ZA' }
    ]

    for (const state of states) {
      await dbHelpers.executeSQL(`
        INSERT INTO states (name, code) 
        VALUES ($1, $2) 
        ON CONFLICT (code) DO NOTHING
      `, [state.name, state.code])
    }

    // Insert default app settings
    await dbHelpers.executeSQL(`
      INSERT INTO app_settings (id, maintenance_mode, max_file_size, allowed_file_types, notification_enabled, auto_backup_enabled, backup_frequency)
      VALUES (1, false, 104857600, ARRAY['image/*', 'video/*', 'audio/*'], true, true, 'daily')
      ON CONFLICT (id) DO NOTHING
    `)

    // Insert default maintenance mode
    await dbHelpers.executeSQL(`
      INSERT INTO maintenance_mode (id, enabled, message)
      VALUES (1, false, '')
      ON CONFLICT (id) DO NOTHING
    `)

    console.log('✅ Initial data inserted')

    // Create RLS policies
    console.log('🔒 Setting up Row Level Security...')
    
    // Enable RLS on all tables
    const tables = [
      'user_profiles', 'incidents', 'incident_updates', 'media_files',
      'live_streams', 'notifications', 'offline_reports'
    ]

    for (const table of tables) {
      await dbHelpers.executeSQL(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)
    }

    // User Profiles RLS policies
    await dbHelpers.executeSQL(`
      CREATE POLICY "Users can view own profile" ON user_profiles
      FOR SELECT USING (auth.uid() = id)
    `)

    await dbHelpers.executeSQL(`
      CREATE POLICY "Users can update own profile" ON user_profiles
      FOR UPDATE USING (auth.uid() = id)
    `)

    await dbHelpers.executeSQL(`
      CREATE POLICY "Admins can view all profiles" ON user_profiles
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
      )
    `)

    // Incidents RLS policies
    await dbHelpers.executeSQL(`
      CREATE POLICY "Users can create incidents" ON incidents
      FOR INSERT WITH CHECK (auth.uid() = user_id)
    `)

    await dbHelpers.executeSQL(`
      CREATE POLICY "Users can view own incidents" ON incidents
      FOR SELECT USING (auth.uid() = user_id)
    `)

    await dbHelpers.executeSQL(`
      CREATE POLICY "Users can update own incidents" ON incidents
      FOR UPDATE USING (auth.uid() = user_id)
    `)

    await dbHelpers.executeSQL(`
      CREATE POLICY "Admins can view all incidents" ON incidents
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
      )
    `)

    await dbHelpers.executeSQL(`
      CREATE POLICY "Admins can update all incidents" ON incidents
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
      )
    `)

    // Media Files RLS policies
    await dbHelpers.executeSQL(`
      CREATE POLICY "Users can upload media for own incidents" ON media_files
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM incidents 
          WHERE id = incident_id AND user_id = auth.uid()
        )
      )
    `)

    await dbHelpers.executeSQL(`
      CREATE POLICY "Users can view media for own incidents" ON media_files
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM incidents 
          WHERE id = incident_id AND user_id = auth.uid()
        )
      )
    `)

    await dbHelpers.executeSQL(`
      CREATE POLICY "Admins can view all media" ON media_files
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM user_profiles 
          WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
      )
    `)

    console.log('✅ RLS policies created')

    // Create functions and triggers
    console.log('⚡ Creating functions and triggers...')
    
    // Function to update location geometry
    await dbHelpers.executeSQL(`
      CREATE OR REPLACE FUNCTION update_incident_location()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)

    // Trigger to automatically update location geometry
    await dbHelpers.executeSQL(`
      DROP TRIGGER IF EXISTS trigger_update_incident_location ON incidents
    `)
    
    await dbHelpers.executeSQL(`
      CREATE TRIGGER trigger_update_incident_location
      BEFORE INSERT OR UPDATE ON incidents
      FOR EACH ROW
      EXECUTE FUNCTION update_incident_location()
    `)

    // Function to get nearby incidents
    await dbHelpers.executeSQL(`
      CREATE OR REPLACE FUNCTION get_nearby_incidents(
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        radius_meters INTEGER DEFAULT 5000
      )
      RETURNS TABLE (
        id UUID,
        title VARCHAR(255),
        distance DOUBLE PRECISION,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8)
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          i.id,
          i.title,
          ST_Distance(
            i.location::geography,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
          ) as distance,
          i.latitude,
          i.longitude
        FROM incidents i
        WHERE ST_DWithin(
          i.location::geography,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          radius_meters
        )
        ORDER BY distance;
      END;
      $$ LANGUAGE plpgsql
    `)

    // Function to update timestamps
    await dbHelpers.executeSQL(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)

    // Create triggers for updated_at columns
    const tablesWithUpdatedAt = ['user_profiles', 'incidents', 'app_settings', 'maintenance_mode']
    
    for (const table of tablesWithUpdatedAt) {
      await dbHelpers.executeSQL(`
        DROP TRIGGER IF EXISTS trigger_update_${table}_updated_at ON ${table}
      `)
      
      await dbHelpers.executeSQL(`
        CREATE TRIGGER trigger_update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      `)
    }

    console.log('✅ Functions and triggers created')

    // Create storage buckets
    console.log('🪣 Setting up storage buckets...')
    
    try {
      // Create incident-media bucket
      await dbHelpers.storage.upload('incident-media', '.keep', new Blob([''], { type: 'text/plain' }))
      console.log('✅ Storage buckets configured')
    } catch (error) {
      console.log('⚠️ Storage bucket setup skipped (may already exist)')
    }

    console.log('🎉 Database initialization completed successfully!')
    console.log('📊 Database is ready for the JUST application')

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✅ Database setup complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error)
      process.exit(1)
    })
}

module.exports = { initializeDatabase }
