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

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // For now, return success without Supabase to test the function
    return res.status(200).json({
      message: 'Auth endpoint working!',
      user: {
        email,
        fullName,
        phone: phone || null
      },
      timestamp: new Date().toISOString()
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
