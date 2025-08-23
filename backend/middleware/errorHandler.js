export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err)

  // Default error
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'
  let error = 'Server Error'

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400
    error = 'Validation Error'
    message = err.message
  } else if (err.name === 'CastError') {
    statusCode = 400
    error = 'Invalid ID'
    message = 'The provided ID is not valid'
  } else if (err.code === 11000) {
    statusCode = 400
    error = 'Duplicate Error'
    message = 'This record already exists'
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    error = 'Invalid Token'
    message = 'The provided token is invalid'
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401
    error = 'Expired Token'
    message = 'The provided token has expired'
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong'
  }

  res.status(statusCode).json({
    error,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}
