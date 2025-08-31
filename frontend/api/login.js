// Simple login endpoint for /login path
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
    const { email, password } = req.body || {}

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      })
    }

    // For now, return a test response
    // TODO: Integrate with your actual auth logic
    return res.status(200).json({
      success: true,
      message: 'Login endpoint is working!',
      user: {
        email,
        id: 'test-user-123',
        fullName: 'Test User'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Login failed' })
  }
}
