// Simplified Authentication API for testing Vercel Functions
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    const { action } = req.query

    switch (req.method) {
      case 'POST':
        return handleAuthAction(req, res, action)
      default:
        return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
    }
  } catch (error) {
    console.error('Auth API error:', error)
    return sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error')
  }
}

// Handle different authentication actions
async function handleAuthAction(req, res, action) {
  try {
    switch (action) {
      case 'login':
        return handleLogin(req, res)
      case 'register':
        return handleRegister(req, res)
      case 'verify-email':
        return handleVerifyEmail(req, res)
      case 'resend-verification':
        return handleResendVerification(req, res)
      default:
        return sendError(res, 400, 'INVALID_ACTION', 'Invalid action specified')
    }
  } catch (error) {
    console.error('Auth action error:', error)
    return sendError(res, 500, 'AUTH_FAILED', 'Authentication failed')
  }
}

// Standardized error response function
function sendError(res, statusCode, errorCode, message, details = null) {
  const errorResponse = {
    success: false,
    error: {
      code: errorCode,
      message: message,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    }
  }
  
  return res.status(statusCode).json(errorResponse)
}

// Standardized success response function
function sendSuccess(res, data, message = 'Operation successful') {
  return res.status(200).json({
    success: true,
    message: message,
    data: data,
    timestamp: new Date().toISOString()
  })
}

// Improved Login with better error handling
async function handleLogin(req, res) {
  try {
    const { email, password } = req.body

    // Validation with detailed error messages
    if (!email && !password) {
      return sendError(res, 400, 'MISSING_CREDENTIALS', 'Email and password are required')
    }
    
    if (!email) {
      return sendError(res, 400, 'MISSING_EMAIL', 'Email is required')
    }
    
    if (!password) {
      return sendError(res, 400, 'MISSING_PASSWORD', 'Password is required')
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return sendError(res, 400, 'INVALID_EMAIL_FORMAT', 'Please enter a valid email address')
    }

    // Password strength validation
    if (password.length < 6) {
      return sendError(res, 400, 'WEAK_PASSWORD', 'Password must be at least 6 characters long')
    }

    // For testing purposes, accept any login
    // TODO: Replace with actual database authentication
    const userData = {
      id: 'test-user-' + Date.now(),
      email: email,
      fullName: 'Test User',
      role: 'user',
      status: 'active',
      lastLogin: new Date().toISOString()
    }

    const accessToken = 'test-token-' + Date.now()

    return sendSuccess(res, {
      user: userData,
      accessToken: accessToken,
      expiresIn: '24h'
    }, 'Login successful')

  } catch (error) {
    console.error('Login error:', error)
    return sendError(res, 500, 'LOGIN_FAILED', 'Login failed. Please try again.')
  }
}

// Improved Registration with better error handling
async function handleRegister(req, res) {
  try {
    const { email, password, fullName, phone } = req.body

    // Comprehensive validation
    if (!email || !password || !fullName) {
      const missingFields = []
      if (!email) missingFields.push('email')
      if (!password) missingFields.push('password')
      if (!fullName) missingFields.push('full name')
      
      return sendError(res, 400, 'MISSING_REQUIRED_FIELDS', 
        `Missing required fields: ${missingFields.join(', ')}`)
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return sendError(res, 400, 'INVALID_EMAIL_FORMAT', 'Please enter a valid email address')
    }

    // Password strength validation
    if (password.length < 8) {
      return sendError(res, 400, 'WEAK_PASSWORD', 
        'Password must be at least 8 characters long')
    }

    // Full name validation
    if (fullName.trim().length < 2) {
      return sendError(res, 400, 'INVALID_FULL_NAME', 
        'Full name must be at least 2 characters long')
    }

    // Phone validation (optional but if provided, validate format)
    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/\s/g, ''))) {
      return sendError(res, 400, 'INVALID_PHONE_FORMAT', 
        'Please enter a valid phone number')
    }

    // For testing purposes, always succeed
    // TODO: Replace with actual database registration
    const userData = {
      id: 'new-user-' + Date.now(),
      email: email,
      fullName: fullName.trim(),
      phone: phone || null,
      role: 'user',
      status: 'active',
      emailVerified: false,
      createdAt: new Date().toISOString()
    }

    const accessToken = 'test-token-' + Date.now()

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: userData,
        accessToken: accessToken,
        expiresIn: '24h'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Registration error:', error)
    return sendError(res, 500, 'REGISTRATION_FAILED', 'Registration failed. Please try again.')
  }
}

// Placeholder functions with standardized responses
async function handleVerifyEmail(req, res) {
  try {
    const { userId, token } = req.body
    
    if (!userId || !token) {
      return sendError(res, 400, 'MISSING_VERIFICATION_DATA', 
        'User ID and verification token are required')
    }

    // TODO: Implement actual email verification
    return sendSuccess(res, { verified: true }, 'Email verified successfully')
  } catch (error) {
    console.error('Email verification error:', error)
    return sendError(res, 500, 'VERIFICATION_FAILED', 'Email verification failed')
  }
}

async function handleResendVerification(req, res) {
  try {
    const { email } = req.body
    
    if (!email) {
      return sendError(res, 400, 'MISSING_EMAIL', 'Email is required')
    }

    // TODO: Implement actual verification email resend
    return sendSuccess(res, { sent: true }, 'Verification email sent successfully')
  } catch (error) {
    console.error('Resend verification error:', error)
    return sendError(res, 500, 'RESEND_FAILED', 'Failed to resend verification email')
  }
}
