// Vercel Function for email verification
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
    const { email, verificationToken } = req.body

    if (!email || !verificationToken) {
      return res.status(400).json({ 
        error: 'Email and verification token are required' 
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      })
    }

    // Validate verification token format (should be alphanumeric, 32 characters)
    if (!/^[A-Za-z0-9]{32}$/.test(verificationToken)) {
      return res.status(400).json({ 
        error: 'Invalid verification token format' 
      })
    }

    // Simulate email verification (in production, this would check database)
    // For now, we'll simulate a successful verification
    
    // Check if user exists and needs verification
    const mockUsers = [
      {
        email: 'test@example.com',
        status: 'pending_verification',
        verificationToken: 'abc123def456ghi789jkl012mno345pqr678'
      }
    ]

    const user = mockUsers.find(u => u.email === email)
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found or already verified' 
      })
    }

    if (user.status !== 'pending_verification') {
      return res.status(400).json({ 
        error: 'Account is already verified or has different status' 
      })
    }

    if (user.verificationToken !== verificationToken) {
      return res.status(400).json({ 
        error: 'Invalid verification token' 
      })
    }

    // Success response - email verified
    return res.status(200).json({
      message: 'Email verified successfully! Your account is now active.',
      user: {
        email,
        status: 'active',
        emailVerified: true,
        verifiedAt: new Date().toISOString()
      },
      nextSteps: [
        'You can now log in to your account',
        'Access all features based on your role',
        'Complete your profile setup',
        'Start using the JUST app'
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Email verification error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
