// Auth function - Vercel expects this in the root
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method === 'POST') {
    const { email, password, fullName, phone } = req.body

    // Check if this is a login (no fullName) or register (has fullName)
    if (fullName) {
      // This is a REGISTER request
      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'Missing required fields for registration' })
      }

      return res.status(200).json({
        message: 'Registration successful!',
        user: {
          email,
          fullName,
          phone: phone || null
        },
        timestamp: new Date().toISOString()
      })
    } else {
      // This is a LOGIN request
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required for login' })
      }

      return res.status(200).json({
        message: 'Login successful!',
        user: {
          email,
          id: 'test-user-123',
          fullName: 'Test User'
        },
        timestamp: new Date().toISOString()
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
