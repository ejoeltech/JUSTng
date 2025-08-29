# JUST Application API Documentation

## Overview
The JUST (Justice Under Surveillance Tech) API provides endpoints for managing police harassment incident reports, user authentication, and administrative functions.

**Base URL**: `http://localhost:5000/api` (Development) / `https://your-backend-domain.com/api` (Production)

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Authentication (`/auth`)

#### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "phone": "+2348012345678",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "+2348012345678",
    "full_name": "John Doe",
    "role": "user",
    "created_at": "2024-08-23T20:47:00Z"
  },
  "message": "User registered successfully"
}
```

#### POST `/auth/login`
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  },
  "token": "jwt_token_here",
  "message": "Login successful"
}
```

#### POST `/auth/reset-password`
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### GET `/auth/verify`
Verify JWT token validity.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### Incidents (`/incidents`)

#### GET `/incidents`
Get all incidents with optional filtering.

**Query Parameters:**
- `status` - Filter by status (reported, investigating, resolved, closed)
- `severity` - Filter by severity (low, medium, high, critical)
- `incident_type` - Filter by type (harassment, assault, extortion, other)
- `state` - Filter by Nigerian state
- `lga` - Filter by Local Government Area
- `date_range` - Filter by date range (7, 30, 90 days)
- `page` - Page number for pagination
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "incidents": [
    {
      "id": "uuid",
      "title": "Police harassment at checkpoint",
      "description": "Officer demanded bribe at checkpoint",
      "incident_type": "harassment",
      "severity": "high",
      "status": "reported",
      "latitude": 6.5244,
      "longitude": 3.3792,
      "address": "Victoria Island, Lagos",
      "incident_date": "2024-08-23T10:00:00Z",
      "is_anonymous": false,
      "user": {
        "id": "uuid",
        "full_name": "John Doe"
      },
      "created_at": "2024-08-23T20:47:00Z",
      "updated_at": "2024-08-23T20:47:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### GET `/incidents/:id`
Get a specific incident by ID.

**Response:**
```json
{
  "success": true,
  "incident": {
    "id": "uuid",
    "title": "Police harassment at checkpoint",
    "description": "Officer demanded bribe at checkpoint",
    "incident_type": "harassment",
    "severity": "high",
    "status": "reported",
    "latitude": 6.5244,
    "longitude": 3.3792,
    "address": "Victoria Island, Lagos",
    "incident_date": "2024-08-23T10:00:00Z",
    "is_anonymous": false,
    "user": {
      "id": "uuid",
      "full_name": "John Doe"
    },
    "media_files": [
      {
        "id": "uuid",
        "file_name": "incident_video_123.webm",
        "file_url": "https://storage.supabase.com/...",
        "file_type": "video/webm",
        "file_size": 1024000
      }
    ],
    "updates": [
      {
        "id": "uuid",
        "status": "investigating",
        "notes": "Case assigned to investigating officer",
        "created_at": "2024-08-23T21:00:00Z"
      }
    ],
    "created_at": "2024-08-23T20:47:00Z",
    "updated_at": "2024-08-23T20:47:00Z"
  }
}
```

#### POST `/incidents`
Create a new incident report.

**Request Body:**
```json
{
  "title": "Police harassment at checkpoint",
  "description": "Officer demanded bribe at checkpoint",
  "incident_type": "harassment",
  "severity": "high",
  "incident_date": "2024-08-23T10:00:00Z",
  "address": "Victoria Island, Lagos",
  "is_anonymous": false,
  "latitude": 6.5244,
  "longitude": 3.3792
}
```

**Response:**
```json
{
  "success": true,
  "incident": {
    "id": "uuid",
    "title": "Police harassment at checkpoint",
    "status": "reported",
    "created_at": "2024-08-23T20:47:00Z"
  },
  "message": "Incident reported successfully"
}
```

#### PUT `/incidents/:id`
Update an existing incident (admin only).

**Request Body:**
```json
{
  "status": "investigating",
  "notes": "Case assigned to investigating officer"
}
```

**Response:**
```json
{
  "success": true,
  "incident": {
    "id": "uuid",
    "status": "investigating",
    "updated_at": "2024-08-23T21:00:00Z"
  },
  "message": "Incident updated successfully"
}
```

#### DELETE `/incidents/:id`
Delete an incident (owner or admin only).

**Response:**
```json
{
  "success": true,
  "message": "Incident deleted successfully"
}
```

#### POST `/incidents/:id/updates`
Add an update to an incident.

**Request Body:**
```json
{
  "status": "investigating",
  "notes": "Case assigned to investigating officer"
}
```

**Response:**
```json
{
  "success": true,
  "update": {
    "id": "uuid",
    "status": "investigating",
    "notes": "Case assigned to investigating officer",
    "created_at": "2024-08-23T21:00:00Z"
  },
  "message": "Update added successfully"
}
```

#### GET `/incidents/nearby`
Get incidents within a specified radius.

**Query Parameters:**
- `lat` - Latitude
- `lng` - Longitude
- `radius` - Radius in meters (default: 5000)

**Response:**
```json
{
  "success": true,
  "incidents": [
    {
      "id": "uuid",
      "title": "Police harassment at checkpoint",
      "distance": 1250.5,
      "latitude": 6.5244,
      "longitude": 3.3792
    }
  ]
}
```

#### POST `/incidents/upload`
Upload media files for incidents.

**Request Body:** `multipart/form-data`
- `file` - Media file (image, video, audio)

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "uuid",
    "file_name": "incident_video_123.webm",
    "file_url": "https://storage.supabase.com/...",
    "file_type": "video/webm",
    "file_size": 1024000
  },
  "message": "File uploaded successfully"
}
```

### Users (`/users`)

#### GET `/users/profile`
Get current user's profile.

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": "+2348012345678",
    "full_name": "John Doe",
    "role": "user",
    "status": "active",
    "created_at": "2024-08-23T20:47:00Z"
  }
}
```

#### PUT `/users/profile`
Update current user's profile.

**Request Body:**
```json
{
  "full_name": "John Smith",
  "phone": "+2348012345678"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "full_name": "John Smith",
    "phone": "+2348012345678",
    "updated_at": "2024-08-23T21:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

#### GET `/users/incidents`
Get current user's reported incidents.

**Response:**
```json
{
  "success": true,
  "incidents": [
    {
      "id": "uuid",
      "title": "Police harassment at checkpoint",
      "status": "reported",
      "created_at": "2024-08-23T20:47:00Z"
    }
  ]
}
```

#### GET `/users/stats`
Get current user's statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_incidents": 5,
    "pending_incidents": 2,
    "resolved_incidents": 3,
    "this_month": 2
  }
}
```

#### GET `/users` (Admin Only)
Get all users with optional filtering.

**Query Parameters:**
- `role` - Filter by role
- `status` - Filter by status
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "user",
      "status": "active",
      "created_at": "2024-08-23T20:47:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### PUT `/users/:id/role` (Admin Only)
Update user role.

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "role": "admin",
    "updated_at": "2024-08-23T21:00:00Z"
  },
  "message": "User role updated successfully"
}
```

### Admin (`/admin`)

#### GET `/admin/dashboard`
Get admin dashboard statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_incidents": 150,
    "pending_incidents": 45,
    "investigating_incidents": 30,
    "resolved_incidents": 75,
    "total_users": 89,
    "new_users_this_month": 12,
    "incidents_by_severity": {
      "low": 20,
      "medium": 45,
      "high": 60,
      "critical": 25
    },
    "incidents_by_state": {
      "Lagos": 45,
      "Kano": 30,
      "Rivers": 25
    }
  }
}
```

#### GET `/admin/incidents`
Get incidents for admin review.

**Query Parameters:**
- `status` - Filter by status
- `severity` - Filter by severity
- `date_range` - Filter by date range
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "success": true,
  "incidents": [
    {
      "id": "uuid",
      "title": "Police harassment at checkpoint",
      "status": "reported",
      "severity": "high",
      "user": {
        "id": "uuid",
        "full_name": "John Doe"
      },
      "created_at": "2024-08-23T20:47:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### PUT `/admin/incidents/:id/assign`
Assign incident to investigating officer.

**Request Body:**
```json
{
  "officerId": "uuid",
  "notes": "Assigned to Officer Smith"
}
```

**Response:**
```json
{
  "success": true,
  "incident": {
    "id": "uuid",
    "assigned_officer": "uuid",
    "status": "investigating",
    "updated_at": "2024-08-23T21:00:00Z"
  },
  "message": "Incident assigned successfully"
}
```

#### PUT `/admin/incidents/:id/status`
Change incident status.

**Request Body:**
```json
{
  "status": "investigating",
  "notes": "Investigation started"
}
```

**Response:**
```json
{
  "success": true,
  "incident": {
    "id": "uuid",
    "status": "investigating",
    "updated_at": "2024-08-23T21:00:00Z"
  },
  "message": "Status updated successfully"
}
```

#### GET `/admin/analytics`
Get incident analytics.

**Query Parameters:**
- `date_range` - Date range for analytics
- `group_by` - Group by (day, week, month, state, severity)

**Response:**
```json
{
  "success": true,
  "analytics": {
    "trends": [
      {
        "date": "2024-08-23",
        "incidents": 5,
        "resolved": 2
      }
    ],
    "summary": {
      "total_incidents": 150,
      "resolution_rate": 0.5,
      "avg_resolution_time": 7.5
    }
  }
}
```

### SuperAdmin (`/super-admin`)

#### GET `/super-admin/stats`
Get system-wide statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "system_health": "healthy",
    "total_users": 89,
    "total_incidents": 150,
    "storage_used": "2.5GB",
    "storage_limit": "10GB",
    "uptime": "99.9%",
    "last_backup": "2024-08-23T18:00:00Z"
  }
}
```

#### GET `/super-admin/health`
Get system health status.

**Response:**
```json
{
  "success": true,
  "health": {
    "database": "healthy",
    "storage": "healthy",
    "auth": "healthy",
    "overall": "healthy",
    "last_check": "2024-08-23T21:00:00Z"
  }
}
```

#### GET `/super-admin/settings`
Get application settings.

**Response:**
```json
{
  "success": true,
  "settings": {
    "maintenance_mode": false,
    "max_file_size": "100MB",
    "allowed_file_types": ["image/*", "video/*", "audio/*"],
    "notification_enabled": true,
    "auto_backup_enabled": true,
    "backup_frequency": "daily"
  }
}
```

#### PUT `/super-admin/settings`
Update application settings.

**Request Body:**
```json
{
  "max_file_size": "200MB",
  "notification_enabled": false
}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "max_file_size": "200MB",
    "notification_enabled": false,
    "updated_at": "2024-08-23T21:00:00Z"
  },
  "message": "Settings updated successfully"
}
```

#### PUT `/super-admin/maintenance`
Toggle maintenance mode.

**Request Body:**
```json
{
  "enabled": true,
  "message": "System maintenance in progress"
}
```

**Response:**
```json
{
  "success": true,
  "maintenance_mode": true,
  "message": "Maintenance mode enabled"
}
```

#### POST `/super-admin/announcements`
Create system announcement.

**Request Body:**
```json
{
  "title": "System Update",
  "message": "Scheduled maintenance on Sunday",
  "type": "info",
  "expires_at": "2024-08-30T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "announcement": {
    "id": "uuid",
    "title": "System Update",
    "message": "Scheduled maintenance on Sunday",
    "type": "info",
    "created_at": "2024-08-23T21:00:00Z"
  },
  "message": "Announcement created successfully"
}
```

#### GET `/super-admin/announcements`
Get all announcements.

**Response:**
```json
{
  "success": true,
  "announcements": [
    {
      "id": "uuid",
      "title": "System Update",
      "message": "Scheduled maintenance on Sunday",
      "type": "info",
      "created_at": "2024-08-23T21:00:00Z",
      "expires_at": "2024-08-30T23:59:59Z"
    }
  ]
}
```

#### POST `/super-admin/backup/configure`
Configure database backup.

**Request Body:**
```json
{
  "frequency": "daily",
  "retention_days": 30,
  "include_media": true
}
```

**Response:**
```json
{
  "success": true,
  "backup_config": {
    "frequency": "daily",
    "retention_days": 30,
    "include_media": true,
    "next_backup": "2024-08-24T02:00:00Z"
  },
  "message": "Backup configuration updated"
}
```

#### GET `/super-admin/backup/status`
Get backup status.

**Response:**
```json
{
  "success": true,
  "backup_status": {
    "last_backup": "2024-08-23T18:00:00Z",
    "next_backup": "2024-08-24T02:00:00Z",
    "backup_size": "1.2GB",
    "status": "completed"
  }
}
```

#### POST `/super-admin/diagnostics`
Run system diagnostics.

**Response:**
```json
{
  "success": true,
  "diagnostics": {
    "database_connections": "healthy",
    "storage_performance": "optimal",
    "api_response_times": "fast",
    "memory_usage": "65%",
    "cpu_usage": "45%",
    "recommendations": [
      "Consider increasing storage allocation",
      "Monitor memory usage trends"
    ]
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` - Request validation failed
- `AUTHENTICATION_ERROR` - Invalid or missing authentication
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource conflict
- `INTERNAL_ERROR` - Server error

## Rate Limiting

- **Authentication endpoints**: 5 requests per minute
- **Incident creation**: 10 requests per hour
- **File uploads**: 20 requests per hour
- **General API**: 100 requests per minute

## File Upload Limits

- **Maximum file size**: 100MB (configurable)
- **Allowed types**: Images (JPEG, PNG, GIF), Videos (MP4, WebM, MOV), Audio (MP3, WAV)
- **Storage**: Supabase Storage with automatic cleanup

## WebSocket Events

Real-time updates via Socket.IO:

- `incident_created` - New incident reported
- `incident_updated` - Incident status changed
- `user_joined` - User connected to map
- `announcement` - New system announcement

## Testing

Use the provided test suite:
```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.js

# Run with coverage
npm run test:coverage
```

## Support

For API support and questions:
- **Email**: support@just-app.com
- **Documentation**: https://docs.just-app.com
- **GitHub Issues**: https://github.com/ejoeltech/JUSTng/issues
