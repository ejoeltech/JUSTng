// Database Initialization Script for Supabase
// Run this once to set up your database schema

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://tuhsvbzbbftaxdfqvxds.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1aHN2YnpiYmZ0YXhkZnF2eGRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImiYXQiOjE3NTU5ODgyNTEsImV4cCI6MjA3MTU2NDI1MX0._AHK2ngkEQsM8Td2rHqZkjVLn9MMCsk7F1UK9u6JXgA'

const supabase = createClient(supabaseUrl, supabaseKey)

// SQL commands to create tables
const createTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'pending_verification',
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  password TEXT NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'reported',
  severity TEXT NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reporter_name TEXT NOT NULL,
  evidence TEXT[] DEFAULT '{}',
  assigned_to TEXT REFERENCES users(id),
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Files table for evidence
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter_id ON incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_files_incident_id ON files(incident_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'superAdmin')
    )
  );

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'superAdmin')
    )
  );

-- RLS Policies for incidents table
CREATE POLICY "Users can view their own incidents" ON incidents
  FOR SELECT USING (reporter_id = auth.uid()::text);

CREATE POLICY "Users can create incidents" ON incidents
  FOR INSERT WITH CHECK (reporter_id = auth.uid()::text);

CREATE POLICY "Users can update their own incidents" ON incidents
  FOR UPDATE USING (reporter_id = auth.uid()::text);

CREATE POLICY "Police can view assigned incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'police'
    ) AND (status = 'reported' OR assigned_to = auth.uid()::text)
  );

CREATE POLICY "Admins can view all incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'superAdmin')
    )
  );

CREATE POLICY "Admins can update all incidents" ON incidents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'superAdmin')
    )
  );

-- RLS Policies for files table
CREATE POLICY "Users can view files from their incidents" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM incidents WHERE id = incident_id AND reporter_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can upload files to their incidents" ON files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM incidents WHERE id = incident_id AND reporter_id = auth.uid()::text
    )
  );

CREATE POLICY "Police can view files from assigned incidents" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM incidents WHERE id = incident_id AND (
        status = 'reported' OR assigned_to = auth.uid()::text
      )
    ) AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'police'
    )
  );

CREATE POLICY "Admins can view all files" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'superAdmin')
    )
  );

-- Create storage bucket for evidence files
-- Note: This requires storage admin privileges
-- You may need to create this manually in the Supabase dashboard
`;

// Function to initialize database
async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...')

    // Execute SQL commands
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL })
    
    if (error) {
      console.error('❌ Database initialization failed:', error)
      return { success: false, error }
    }

    console.log('✅ Database tables created successfully')

    // Create storage bucket (if not exists)
    try {
      const { data: bucketData, error: bucketError } = await supabase.storage
        .createBucket('evidence', {
          public: false,
          allowedMimeTypes: ['image/*', 'video/*'],
          fileSizeLimit: 52428800 // 50MB
        })

      if (bucketError && !bucketError.message.includes('already exists')) {
        console.error('⚠️ Storage bucket creation warning:', bucketError)
      } else {
        console.log('✅ Storage bucket "evidence" created successfully')
      }
    } catch (storageError) {
      console.log('ℹ️ Storage bucket may already exist or requires manual creation')
    }

    // Insert default admin user if not exists
    const adminEmail = 'admin@just-app.ng'
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single()

    if (!existingAdmin) {
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash('admin123456', 12)
      
      const { error: adminError } = await supabase
        .from('users')
        .insert([{
          id: 'admin-001',
          email: adminEmail,
          full_name: 'System Administrator',
          role: 'superAdmin',
          status: 'active',
          email_verified: true,
          password: hashedPassword,
          organization: 'JUST System',
          created_at: new Date().toISOString()
        }])

      if (adminError) {
        console.error('⚠️ Default admin creation warning:', adminError)
      } else {
        console.log('✅ Default admin user created')
      }
    }

    console.log('🎉 Database initialization completed successfully!')
    return { success: true }

  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    return { success: false, error }
  }
}

// Export for use in other files
export { initializeDatabase }

// If running directly, execute initialization
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(result => {
      if (result.success) {
        console.log('✅ Database is ready for use!')
        process.exit(0)
      } else {
        console.error('❌ Database initialization failed')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error)
      process.exit(1)
    })
}
