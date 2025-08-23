# Backend Database Scripts

This directory contains scripts for managing the JUST application database.

## Scripts

### `init-database.js`
Initializes the database with all required tables, indexes, and initial data.

**Usage:**
```bash
npm run db:init
```

**What it does:**
- Creates all database tables (user_profiles, incidents, media_files, etc.)
- Sets up PostGIS extensions and spatial indexes
- Creates performance indexes
- Inserts Nigerian states and FCT data
- Sets up Row Level Security (RLS) policies
- Creates database functions and triggers
- Configures storage buckets

### `test-database.js`
Tests the database service to ensure everything is working correctly.

**Usage:**
```bash
npm run db:test
```

**What it tests:**
- Database connection
- App settings retrieval
- States data
- System statistics
- Maintenance mode
- User profile operations (if auth is configured)

## Prerequisites

Before running these scripts, ensure you have:

1. **Supabase Project Setup:**
   - Created a Supabase project
   - Enabled PostGIS extension
   - Set up environment variables

2. **Environment Variables:**
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Dependencies Installed:**
   ```bash
   npm install
   ```

## Database Schema

The initialization script creates the following structure:

### Core Tables
- **user_profiles**: User accounts and roles
- **incidents**: Harassment reports with GPS coordinates
- **incident_updates**: Status updates and notes
- **media_files**: Photos, videos, and audio evidence
- **live_streams**: Live video streaming sessions

### Administrative Tables
- **states**: Nigerian states and FCT
- **lgas**: Local Government Areas
- **notifications**: User notifications
- **app_settings**: Application configuration
- **maintenance_mode**: System maintenance status

### Features
- **PostGIS Integration**: Spatial queries and location-based features
- **Row Level Security**: Data access control based on user roles
- **Automatic Timestamps**: Created/updated timestamps
- **Spatial Indexes**: Fast location-based queries
- **UUID Primary Keys**: Secure, unique identifiers

## Troubleshooting

### Common Issues

1. **PostGIS Extension Error:**
   - Ensure PostGIS is enabled in your Supabase project
   - Check database permissions

2. **RLS Policy Errors:**
   - Verify Supabase auth is properly configured
   - Check service role key permissions

3. **Storage Bucket Errors:**
   - Ensure storage is enabled in Supabase
   - Check bucket policies

### Reset Database

To reset the database (⚠️ **WARNING**: This will delete all data):

```bash
npm run db:reset
```

## Next Steps

After running the initialization script:

1. **Test the database:**
   ```bash
   npm run db:test
   ```

2. **Start the backend server:**
   ```bash
   npm run dev
   ```

3. **Verify API endpoints** are working with the new database

## Security Notes

- The service role key has full database access
- RLS policies control user data access
- All user inputs are validated and sanitized
- File uploads are restricted by type and size
- Authentication is required for sensitive operations
