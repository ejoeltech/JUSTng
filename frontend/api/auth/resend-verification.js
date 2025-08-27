// Vercel Function for resending verification emails
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
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      })
    }

    // Simulate checking if user exists and needs verification
    // In production, this would check the database
    
    // Generate new verification token
    const newVerificationToken = Math.random().toString(36).substring(2, 15) + 
                                Math.random().toString(36).substring(2, 15)

    // Success response - verification email resent
    return res.status(200).json({
      message: 'Verification email resent successfully!',
      emailConfirmation: {
        sent: true,
        message: `New verification email sent to ${email}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        resendAvailable: false, // Prevent immediate resend
        cooldown: 300 // 5 minutes cooldown
      },
      verificationToken: newVerificationToken, // In production, this would be sent via email
      instructions: [
        'Check your email for the new verification link',
        'Check spam/junk folder if not in inbox',
        'Verification link expires in 24 hours',
        'Contact support if you still have issues'
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Resend verification error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
