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
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Auth API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error' 
    })
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
        return res.status(400).json({ error: 'Invalid action specified' })
    }
  } catch (error) {
    console.error('Auth action error:', error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}

// Simplified Login for testing
async function handleLogin(req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      })
    }

    // For testing purposes, accept any login
    // TODO: Replace with actual database authentication
    return res.status(200).json({
      success: true,
      message: 'Login successful (test mode)',
      user: {
        id: 'test-user-123',
        email: email,
        fullName: 'Test User',
        role: 'user',
        status: 'active'
      },
      accessToken: 'test-token-' + Date.now()
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Login failed' })
  }
}

// Simplified Registration for testing
async function handleRegister(req, res) {
  try {
    const { email, password, fullName } = req.body

    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        error: 'Email, password, and full name are required' 
      })
    }

    // For testing purposes, always succeed
    // TODO: Replace with actual database registration
    return res.status(201).json({
      success: true,
      message: 'Registration successful (test mode)',
      user: {
        id: 'new-user-' + Date.now(),
        email: email,
        fullName: fullName,
        role: 'user',
        status: 'active'
      },
      accessToken: 'test-token-' + Date.now()
    })

  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Registration failed' })
  }
}

// Placeholder functions
async function handleVerifyEmail(req, res) {
  return res.status(200).json({ success: true, message: 'Email verification (test mode)' })
}

async function handleResendVerification(req, res) {
  return res.status(200).json({ success: true, message: 'Verification email resent (test mode)' })
}
