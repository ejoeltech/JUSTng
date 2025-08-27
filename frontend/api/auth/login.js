// Vercel Function for secure user login with real database integration
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import databaseService from '../services/database.js'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      })
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters' 
      })
    }

    // Get user from database
    const userResult = await databaseService.getUserByEmail(email)
    if (userResult.error || !userResult.data) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      })
    }

    const user = userResult.data
    
    if (user.status !== 'active') {
      return res.status(401).json({ 
        error: 'Account is not active. Please verify your email first.' 
      })
    }

    if (!user.email_verified) {
      return res.status(401).json({ 
        error: 'Please verify your email before logging in.' 
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      })
    }

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        status: user.status 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Update last login
    await databaseService.updateUser(user.id, { last_login: new Date().toISOString() })

    // Success response
    return res.status(200).json({
      message: 'Login successful!',
      user: { 
        id: user.id, 
        email: user.email, 
        fullName: user.full_name, 
        role: user.role, 
        status: user.status, 
        lastLogin: user.last_login,
        emailVerified: user.email_verified
      },
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: '24h',
      accessLevel: user.role === 'superAdmin' ? 'full' : user.role === 'admin' ? 'admin' : user.role === 'police' ? 'police' : 'restricted',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ 
      error: 'Internal server error during login' 
    })
  }
}
