// Vercel Function for secure user login with JWT
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

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

    // Simulated user database (in production, this would be Supabase)
    const users = [
      { 
        id: 'user-001', 
        email: 'admin@just-app.ng', 
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123456
        fullName: 'System Administrator', 
        role: 'superAdmin', 
        status: 'active', 
        lastLogin: null,
        emailVerified: true
      },
      { 
        id: 'user-002', 
        email: 'police@just-app.ng', 
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // police123456
        fullName: 'Police Officer', 
        role: 'police', 
        status: 'active', 
        lastLogin: null,
        emailVerified: true
      },
      { 
        id: 'user-003', 
        email: 'user@just-app.ng', 
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // user123456
        fullName: 'Standard User', 
        role: 'user', 
        status: 'active', 
        lastLogin: null,
        emailVerified: true
      }
    ]

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      })
    }

    if (user.status !== 'active') {
      return res.status(401).json({ 
        error: 'Account is not active. Please verify your email first.' 
      })
    }

    if (!user.emailVerified) {
      return res.status(401).json({ 
        error: 'Please verify your email before logging in.' 
      })
    }

    // Verify password (in production, use bcrypt.compare)
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
    user.lastLogin = new Date().toISOString()

    // Success response
    return res.status(200).json({
      message: 'Login successful!',
      user: { 
        id: user.id, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role, 
        status: user.status, 
        lastLogin: user.lastLogin,
        emailVerified: user.emailVerified
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
