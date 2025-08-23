import express from 'express'
import { body, validationResult } from 'express-validator'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const router = express.Router()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').isMobilePhone('en-NG').withMessage('Please provide a valid Nigerian phone number'),
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters')
]

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
]

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      })
    }

    const { email, password, phone, fullName } = req.body

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const userExists = existingUser.users.find(user => user.email === email)

    if (userExists) {
      return res.status(400).json({
        error: 'User Exists',
        message: 'A user with this email already exists'
      })
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone
      }
    })

    if (authError) {
      return res.status(400).json({
        error: 'Registration Failed',
        message: authError.message
      })
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert([
        {
          id: authData.user.id,
          email: authData.user.email,
          phone: phone,
          full_name: fullName,
          role: 'user',
          created_at: new Date().toISOString()
        }
      ])

    if (profileError) {
      // If profile creation fails, delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return res.status(500).json({
        error: 'Profile Creation Failed',
        message: 'Failed to create user profile'
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: authData.user.id, email: authData.user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    )

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName,
        phone,
        role: 'user'
      },
      token
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      error: 'Registration Failed',
      message: 'An error occurred during registration'
    })
  }
})

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      })
    }

    const { email, password } = req.body

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid email or password'
      })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      return res.status(500).json({
        error: 'Profile Error',
        message: 'Failed to retrieve user profile'
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: authData.user.id, email: authData.user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    )

    res.json({
      message: 'Login successful',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullName: profile.full_name,
        phone: profile.phone,
        role: profile.role
      },
      token
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      error: 'Login Failed',
      message: 'An error occurred during login'
    })
  }
})

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        error: 'Missing Email',
        message: 'Email is required'
      })
    }

    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    })

    if (error) {
      return res.status(400).json({
        error: 'Reset Failed',
        message: error.message
      })
    }

    res.json({
      message: 'Password reset email sent successfully'
    })

  } catch (error) {
    console.error('Password reset error:', error)
    res.status(500).json({
      error: 'Reset Failed',
      message: 'An error occurred during password reset'
    })
  }
})

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({
        error: 'No Token',
        message: 'No token provided'
      })
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // Get user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Token is invalid or expired'
      })
    }

    res.json({
      message: 'Token is valid',
      user: {
        id: user.id,
        email: user.email
      }
    })

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token Expired',
        message: 'Token has expired'
      })
    }
    
    res.status(401).json({
      error: 'Invalid Token',
      message: 'Token verification failed'
    })
  }
})

export default router
