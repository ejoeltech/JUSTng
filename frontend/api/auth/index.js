// Consolidated Authentication API - Handles all auth operations
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import databaseService from '../services/database.js'

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

// User Login
async function handleLogin(req, res) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      })
    }

    // Get user from database
    const userResult = await databaseService.getUserByEmail(email)
    
    if (userResult.error || !userResult.data) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      })
    }

    const user = userResult.data

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({ 
        error: 'Account is not active. Please verify your email first.' 
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      })
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || '55237cdd177c6991d83d1494836e11f0a443a07455116bc6722f57e9acc45dc66e296af98d025dd1c902eb857a5d28447f4503c6db95ef5d58b184f0f0ab0204'
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      jwtSecret,
      { expiresIn: '24h' }
    )

    // Update last login
    await databaseService.updateUser(user.id, { 
      last_login: new Date().toISOString() 
    })

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        emailVerified: user.email_verified
      },
      accessToken
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Login failed' })
  }
}

// User Registration
async function handleRegister(req, res) {
  try {
    const { 
      email, 
      password, 
      fullName, 
      phone, 
      organization, 
      inviteCode 
    } = req.body

    if (!email || !password || !fullName || !inviteCode) {
      return res.status(400).json({ 
        error: 'Email, password, full name, and invite code are required' 
      })
    }

    // Validate invite code (simplified for now)
    if (inviteCode !== 'JUST2024') {
      return res.status(400).json({ 
        error: 'Invalid invite code' 
      })
    }

    // Check if user already exists
    const existingUser = await databaseService.getUserByEmail(email)
    if (existingUser.data) {
      return res.status(400).json({ 
        error: 'User with this email already exists' 
      })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user data
    const userData = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      fullName,
      phone: phone || null,
      organization: organization || null,
      role: 'user',
      status: 'pending_verification',
      emailVerified: false,
      verificationToken: `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      password: hashedPassword
    }

    // Save user to database
    const result = await databaseService.createUser(userData)
    
    if (result.error) {
      console.error('User creation error:', result.error)
      return res.status(500).json({ 
        error: 'Failed to create user' 
      })
    }

    // Generate JWT token for immediate login
    const jwtSecret = process.env.JWT_SECRET || '55237cdd177c6991d83d1494836e11f0a443a07455116bc6722f57e9acc45dc66e296af98d025dd1c902eb857a5d28447f4503c6db95ef5d58b184f0f0ab0204'
    const accessToken = jwt.sign(
      { 
        userId: userData.id, 
        email: userData.email, 
        role: userData.role 
      },
      jwtSecret,
      { expiresIn: '24h' }
    )

    return res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      user: {
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        status: userData.status,
        emailVerified: userData.emailVerified
      },
      accessToken
    })

  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Registration failed' })
  }
}

// Email Verification
async function handleVerifyEmail(req, res) {
  try {
    const { userId, token } = req.body

    if (!userId || !token) {
      return res.status(400).json({ 
        error: 'User ID and verification token are required' 
      })
    }

    // Verify email in database
    const result = await databaseService.verifyUserEmail(userId, token)
    
    if (result.error) {
      return res.status(400).json({ 
        error: 'Invalid verification token' 
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. Your account is now active.'
    })

  } catch (error) {
    console.error('Email verification error:', error)
    return res.status(500).json({ error: 'Email verification failed' })
  }
}

// Resend Verification Email
async function handleResendVerification(req, res) {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      })
    }

    // Get user from database
    const userResult = await databaseService.getUserByEmail(email)
    
    if (userResult.error || !userResult.data) {
      return res.status(404).json({ 
        error: 'User not found' 
      })
    }

    const user = userResult.data

    if (user.email_verified) {
      return res.status(400).json({ 
        error: 'Email is already verified' 
      })
    }

    // Generate new verification token
    const newToken = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await databaseService.updateUser(user.id, { 
      verification_token: newToken 
    })

    // In a real app, send email here
    // For now, just return success
    return res.status(200).json({
      success: true,
      message: 'Verification email resent successfully. Please check your inbox.'
    })

  } catch (error) {
    console.error('Resend verification error:', error)
    return res.status(500).json({ error: 'Failed to resend verification email' })
  }
}
