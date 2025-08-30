# JUST API Error Codes Documentation

## Overview
This document outlines all standardized error codes used across the JUST API endpoints. All errors follow a consistent structure for better debugging and user experience.

## Error Response Structure
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2024-08-29T18:00:00.000Z",
    "requestId": "req_1234567890",
    "path": "/api/auth?action=login",
    "method": "POST",
    "details": "Additional error details (development only)"
  }
}
```

## Authentication Errors (4xx)

### 400 - Bad Request
| Code | Message | Description |
|------|---------|-------------|
| `MISSING_CREDENTIALS` | Email and password are required | Both email and password fields are empty |
| `MISSING_EMAIL` | Email is required | Email field is missing |
| `MISSING_PASSWORD` | Password is required | Password field is missing |
| `INVALID_EMAIL_FORMAT` | Please enter a valid email address | Email format is invalid |
| `WEAK_PASSWORD` | Password must be at least 6 characters long | Password doesn't meet minimum requirements |
| `MISSING_REQUIRED_FIELDS` | Missing required fields: email, password, full name | Required fields are missing during registration |
| `INVALID_FULL_NAME` | Full name must be at least 2 characters long | Full name is too short |
| `INVALID_PHONE_FORMAT` | Please enter a valid phone number | Phone number format is invalid |
| `INVALID_ACTION` | Invalid action specified | Unknown action parameter in auth endpoint |
| `MISSING_VERIFICATION_DATA` | User ID and verification token are required | Missing data for email verification |

### 401 - Unauthorized
| Code | Message | Description |
|------|---------|-------------|
| `UNAUTHORIZED` | Authentication required | User is not authenticated |
| `INVALID_CREDENTIALS` | Invalid credentials | Email/password combination is incorrect |
| `ACCOUNT_INACTIVE` | Account is not active. Please verify your email first | Account requires email verification |
| `TOKEN_EXPIRED` | Authentication token has expired | JWT token is no longer valid |

### 403 - Forbidden
| Code | Message | Description |
|------|---------|-------------|
| `FORBIDDEN` | Access denied | User doesn't have permission for this action |
| `INSUFFICIENT_PERMISSIONS` | Insufficient permissions for this action | User role doesn't allow this operation |

### 404 - Not Found
| Code | Message | Description |
|------|---------|-------------|
| `NOT_FOUND` | Resource not found | Requested resource doesn't exist |
| `USER_NOT_FOUND` | User not found | User with specified email/ID doesn't exist |
| `INCIDENT_NOT_FOUND` | Incident not found | Incident with specified ID doesn't exist |

### 405 - Method Not Allowed
| Code | Message | Description |
|------|---------|-------------|
| `METHOD_NOT_ALLOWED` | Method not allowed | HTTP method not supported for this endpoint |

### 409 - Conflict
| Code | Message | Description |
|------|---------|-------------|
| `CONFLICT` | Resource conflict | Resource already exists or conflicts with current state |
| `USER_ALREADY_EXISTS` | User with this email already exists | Email is already registered |

### 429 - Too Many Requests
| Code | Message | Description |
|------|---------|-------------|
| `RATE_LIMIT_EXCEEDED` | Too many requests. Please try again later | Rate limit exceeded for this endpoint |

## Server Errors (5xx)

### 500 - Internal Server Error
| Code | Message | Description |
|------|---------|-------------|
| `INTERNAL_ERROR` | Internal server error | Unexpected server error occurred |
| `LOGIN_FAILED` | Login failed. Please try again | Login process encountered an error |
| `REGISTRATION_FAILED` | Registration failed. Please try again | Registration process encountered an error |
| `AUTH_FAILED` | Authentication failed | General authentication error |
| `VERIFICATION_FAILED` | Email verification failed | Email verification process failed |
| `RESEND_FAILED` | Failed to resend verification email | Email resend process failed |

## Success Response Structure
```json
{
  "success": true,
  "message": "Operation successful message",
  "data": {
    // Response data specific to the endpoint
  },
  "timestamp": "2024-08-29T18:00:00.000Z"
}
```

## Usage Examples

### Frontend Error Handling
```javascript
try {
  const response = await fetch('/api/auth?action=login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  
  const result = await response.json()
  
  if (!result.success) {
    // Handle error based on error code
    switch (result.error.code) {
      case 'MISSING_EMAIL':
        showError('Please enter your email address')
        break
      case 'INVALID_EMAIL_FORMAT':
        showError('Please enter a valid email address')
        break
      case 'WEAK_PASSWORD':
        showError('Password must be at least 6 characters long')
        break
      default:
        showError(result.error.message)
    }
  } else {
    // Handle success
    handleLoginSuccess(result.data)
  }
} catch (error) {
  showError('Network error. Please try again.')
}
```

### Error Logging
```javascript
// Log errors with request context
if (!result.success) {
  console.error('API Error:', {
    code: result.error.code,
    message: result.error.message,
    requestId: result.error.requestId,
    path: result.error.path,
    timestamp: result.error.timestamp
  })
}
```

## Best Practices

1. **Always check `success` field** before processing response
2. **Use error codes** for conditional logic in your application
3. **Display user-friendly messages** from the `message` field
4. **Log error details** for debugging purposes
5. **Handle network errors** separately from API errors
6. **Implement retry logic** for rate limit errors
7. **Show appropriate UI feedback** based on error type

## Development vs Production

- **Development**: Error responses include `details` and `stack` for debugging
- **Production**: Error responses exclude sensitive information for security
- **Request IDs**: Always included for tracking requests across logs
- **Timestamps**: ISO 8601 format for consistent time handling
