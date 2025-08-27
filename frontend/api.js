// Main API function - Vercel expects this in the root
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Route based on the path
  const path = req.url || req.path || ''

  if (path.includes('/auth/login')) {
    // Handle login
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    return res.status(200).json({
      message: 'Login endpoint working! (Test mode)',
      user: {
        email,
        id: 'test-user-123',
        fullName: 'Test User'
      },
      timestamp: new Date().toISOString()
    })
  }

  if (path.includes('/auth/register')) {
    // Handle registration
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { email, password, fullName, phone } = req.body || {}
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' })
    }

    return res.status(200).json({
      message: 'Registration endpoint working! (Test mode)',
      user: {
        email,
        fullName,
        phone: phone || null,
        id: 'new-user-' + Date.now()
      },
      timestamp: new Date().toISOString()
    })
  }

  // Default response for /api
  return res.status(200).json({
    message: 'JUST API is working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      test: '/api',
      login: '/api/auth/login',
      register: '/api/auth/register'
    }
  })
}
