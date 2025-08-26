// Vercel Function for user registration
export default async function handler(req, res) {
  // Handle CORS
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
    const { email, password, fullName, phone } = req.body

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // For now, return success without Supabase to test the function
    return res.status(200).json({
      message: 'Registration endpoint working!',
      user: {
        email,
        fullName,
        phone: phone || null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
