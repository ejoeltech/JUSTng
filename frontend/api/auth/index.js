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
      case 'GET':
        if (action === 'verify') {
          return handleTokenVerify(req, res)
        }
        return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
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
      case 'logout':
        return handleLogout(req, res)
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

    // Get users from local storage (simulate database)
    const existingUsers = JSON.parse(process.env.LOCAL_USERS || '[]')
    const user = existingUsers.find(u => u.email === email && u.password === password)

    if (!user) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password')
    }

    // Check if user is active
    if (user.status !== 'active') {
      return sendError(res, 403, 'ACCOUNT_INACTIVE', 'Your account is not active. Please contact support.')
    }

    // Generate JWT-like token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }
    
    const accessToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64')

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    // Update last login
    user.lastLogin = new Date().toISOString()
    const userIndex = existingUsers.findIndex(u => u.id === user.id)
    if (userIndex !== -1) {
      existingUsers[userIndex] = user
      process.env.LOCAL_USERS = JSON.stringify(existingUsers)
    }

    return sendSuccess(res, {
      user: userWithoutPassword,
      accessToken: accessToken,
      tokenType: 'Bearer',
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
    const { email, password, fullName, phone, inviteCode } = req.body

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

    // Invite code validation
    const validInviteCodes = ['JUST2024', 'ADMIN2024', 'POLICE001']
    if (!inviteCode || !validInviteCodes.includes(inviteCode)) {
      return sendError(res, 400, 'INVALID_INVITE_CODE', 
        'Invalid invite code. Available codes: JUST2024, ADMIN2024, POLICE001')
    }

    // Determine role based on invite code
    let role = 'user'
    if (inviteCode === 'ADMIN2024') role = 'admin'
    if (inviteCode === 'POLICE001') role = 'police'

    // Check if user already exists (simulate database check)
    const existingUsers = JSON.parse(process.env.LOCAL_USERS || '[]')
    if (existingUsers.find(u => u.email === email)) {
      return sendError(res, 409, 'USER_EXISTS', 'User with this email already exists')
    }

    // Create user data
    const userData = {
      id: 'user-' + Date.now(),
      email: email,
      fullName: fullName.trim(),
      phone: phone || null,
      role: role,
      status: 'active',
      emailVerified: true, // For testing, auto-verify
      createdAt: new Date().toISOString()
    }

    // Generate JWT-like token
    const tokenPayload = {
      userId: userData.id,
      email: userData.email,
      role: userData.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }
    
    const accessToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64')

    // Store user locally (simulate database)
    existingUsers.push({ ...userData, password: password }) // In real app, hash password
    process.env.LOCAL_USERS = JSON.stringify(existingUsers)

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: userData,
        accessToken: accessToken,
        tokenType: 'Bearer',
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

// Token verification endpoint
async function handleTokenVerify(req, res) {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return sendError(res, 401, 'NO_TOKEN', 'No token provided')
    }

    try {
      // Decode the base64 token
      const tokenPayload = JSON.parse(Buffer.from(token, 'base64').toString())
      
      // Check if token is expired
      const now = Math.floor(Date.now() / 1000)
      if (tokenPayload.exp && tokenPayload.exp < now) {
        return sendError(res, 401, 'TOKEN_EXPIRED', 'Token has expired')
      }

      // Get user from local storage
      const existingUsers = JSON.parse(process.env.LOCAL_USERS || '[]')
      const user = existingUsers.find(u => u.id === tokenPayload.userId)

      if (!user) {
        return sendError(res, 401, 'USER_NOT_FOUND', 'User not found')
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user

      return sendSuccess(res, {
        valid: true,
        user: userWithoutPassword,
        token: tokenPayload
      }, 'Token is valid')

    } catch (decodeError) {
      return sendError(res, 401, 'INVALID_TOKEN', 'Invalid token format')
    }

  } catch (error) {
    console.error('Token verification error:', error)
    return sendError(res, 500, 'VERIFICATION_FAILED', 'Token verification failed')
  }
}

// Logout endpoint
async function handleLogout(req, res) {
  try {
    // In a real application, you would:
    // 1. Add token to blacklist
    // 2. Clear server-side session
    // 3. Log the logout event
    
    return sendSuccess(res, { 
      loggedOut: true 
    }, 'Logout successful')
  } catch (error) {
    console.error('Logout error:', error)
    return sendError(res, 500, 'LOGOUT_FAILED', 'Logout failed')
  }
}
