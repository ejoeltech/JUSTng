// JWT Authentication Middleware
import jwt from 'jsonwebtoken'

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    })
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      status: decoded.status
    }
    
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      })
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Invalid authentication token. Please log in again.'
      })
    }
    
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Unable to authenticate user'
    })
  }
}

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to access this resource'
      })
    }

    next()
  }
}

export const requireActiveStatus = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    })
  }

  if (req.user.status !== 'active') {
    return res.status(403).json({ 
      error: 'Account inactive',
      message: 'Your account is not active. Please verify your email or contact support.'
    })
  }

  next()
}

export const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    })
  }

  // This would check email verification status from database
  // For now, we'll assume it's verified if they have a valid token
  next()
}
