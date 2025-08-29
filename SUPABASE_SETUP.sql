-- =====================================================
-- SUPABASE DATABASE SETUP SCRIPT
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. CREATE TABLES
-- =====================================================

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

-- 2. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter_id ON incidents(reporter_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_files_incident_id ON files(incident_id);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
-- =====================================================

-- Users table policies
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

-- Incidents table policies
CREATE POLICY "Users can view their own incidents" ON incidents
  FOR SELECT USING (reporter_id = auth.uid()::text);

CREATE POLICY "Users can create incidents" ON incidents
  FOR INSERT WITH CHECK (reporter_id = auth.uid()::text);

CREATE POLICY "Users can update their own incidents" ON incidents
  FOR UPDATE USING (reporter_id = auth.uid()::text);

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

-- Files table policies
CREATE POLICY "Users can view files for their incidents" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM incidents WHERE id = files.incident_id AND reporter_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can upload files for their incidents" ON files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM incidents WHERE id = files.incident_id AND reporter_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can view all files" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('admin', 'superAdmin')
    )
  );

-- 5. INSERT DEFAULT ADMIN USER
-- =====================================================

-- Note: Password will be 'admin123456' - CHANGE THIS IN PRODUCTION!
INSERT INTO users (id, email, full_name, role, status, email_verified, password, organization, created_at)
VALUES (
  'admin-001',
  'admin@just-app.ng',
  'System Administrator',
  'superAdmin',
  'active',
  true,
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.OeG', -- admin123456
  'JUST System',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 6. VERIFY SETUP
-- =====================================================

-- Check tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('users', 'incidents', 'files') THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'incidents', 'files');

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('users', 'incidents', 'files');

-- Check admin user exists
SELECT 
  id,
  email,
  full_name,
  role,
  status,
  email_verified
FROM users 
WHERE email = 'admin@just-app.ng';
