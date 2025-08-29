// Comprehensive Error Handling Middleware
export function errorHandler(err, req, res, next) {
  console.error('API Error:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack
  })

  // Determine error type and status code
  let statusCode = 500
  let errorCode = 'INTERNAL_ERROR'
  let message = 'An unexpected error occurred'

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400
    errorCode = 'VALIDATION_ERROR'
    message = 'Validation failed'
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401
    errorCode = 'UNAUTHORIZED'
    message = 'Authentication required'
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403
    errorCode = 'FORBIDDEN'
    message = 'Access denied'
  } else if (err.name === 'NotFoundError') {
    statusCode = 404
    errorCode = 'NOT_FOUND'
    message = 'Resource not found'
  } else if (err.name === 'ConflictError') {
    statusCode = 409
    errorCode = 'CONFLICT'
    message = 'Resource conflict'
  } else if (err.name === 'RateLimitError') {
    statusCode = 429
    errorCode = 'RATE_LIMIT_EXCEEDED'
    message = 'Too many requests. Please try again later.'
  }

  // Send standardized error response
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: message,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
      path: req.url,
      method: req.method,
      ...(process.env.NODE_ENV === 'development' && {
        details: err.message,
        stack: err.stack
      })
    }
  }

  res.status(statusCode).json(errorResponse)
}

// Custom error classes for consistent error handling
export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends Error {
  constructor(message = 'Rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}

// Utility function to create standardized errors
export function createError(errorType, message, details = null) {
  const ErrorClass = {
    validation: ValidationError,
    unauthorized: UnauthorizedError,
    forbidden: ForbiddenError,
    notFound: NotFoundError,
    conflict: ConflictError,
    rateLimit: RateLimitError
  }[errorType] || Error

  return new ErrorClass(message, details)
}
