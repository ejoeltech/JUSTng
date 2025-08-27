// Vercel Function for secure user login
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

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      })
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      })
    }

    // Simulated user database (in production, this would be Supabase)
    const users = [
      {
        id: 'user-001',
        email: 'admin@just-app.ng',
        password: 'admin123456', // In production, this would be hashed
        fullName: 'System Administrator',
        role: 'superAdmin',
        status: 'active',
        lastLogin: null
      },
      {
        id: 'user-002',
        email: 'police@just-app.ng',
        password: 'police123456',
        fullName: 'Police Officer',
        role: 'police',
        status: 'active',
        lastLogin: null
      },
      {
        id: 'user-003',
        email: 'user@just-app.ng',
        password: 'user123456',
        fullName: 'Standard User',
        role: 'user',
        status: 'active',
        lastLogin: null
      }
    ]

    // Find user by email
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password. Please check your credentials.' 
      })
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({ 
        error: 'Account is deactivated. Please contact an administrator.' 
      })
    }

    // Validate password (in production, use bcrypt to compare hashed passwords)
    if (user.password !== password) {
      return res.status(401).json({ 
        error: 'Invalid email or password. Please check your credentials.' 
      })
    }

    // Update last login time
    user.lastLogin = new Date().toISOString()

    // Generate session token (in production, use JWT)
    const sessionToken = `session_${user.id}_${Date.now()}`

    // Success response
    return res.status(200).json({
      message: 'Login successful!',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        lastLogin: user.lastLogin
      },
      session: {
        token: sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      },
      accessLevel: user.role === 'superAdmin' ? 'full' : 
                   user.role === 'admin' ? 'admin' : 
                   user.role === 'police' ? 'police' : 'restricted',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
