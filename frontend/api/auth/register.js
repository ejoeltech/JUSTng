// Vercel Function for restricted user registration
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
    const { email, password, fullName, phone, inviteCode, organization, role } = req.body

    // Validate required fields
    if (!email || !password || !fullName || !inviteCode) {
      return res.status(400).json({ 
        error: 'Email, password, full name, and invite code are required' 
      })
    }

    // Validate invite code
    const validInviteCodes = ['JUST2024', 'POLICE001', 'ADMIN2024', 'SUPER2024', 'NIGERIA1', 'SECURITY1', 'MONITOR1', 'REPORT1']
    if (!validInviteCodes.includes(inviteCode)) {
      return res.status(400).json({ 
        error: 'Invalid invite code. Please use a valid code from your invitation.' 
      })
    }

    // Determine user role based on invite code
    let userRole = 'user' // default role
    if (inviteCode === 'ADMIN2024') userRole = 'admin'
    if (inviteCode === 'SUPER2024') userRole = 'superAdmin'
    if (inviteCode === 'POLICE001') userRole = 'police'

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address' 
      })
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      })
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      })
    }

    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2, 15) + 
                            Math.random().toString(36).substring(2, 15) +
                            Math.random().toString(36).substring(2, 15) +
                            Math.random().toString(36).substring(2, 15)

    // In a real system, you would:
    // 1. Hash the password
    // 2. Store user in database
    // 3. Send actual verification email
    // 4. Store verification token securely

    // For now, we'll simulate the process
    const user = {
      id: 'user-' + Date.now(),
      email,
      fullName,
      phone: phone || null,
      organization: organization || 'Nigerian Police Monitoring',
      role: userRole,
      inviteCode: inviteCode,
      status: 'pending_verification',
      emailVerified: false,
      verificationToken: verificationToken,
      createdAt: new Date().toISOString()
    }

    // Success response with verification details
    return res.status(200).json({
      message: 'Registration successful! Please verify your email to activate your account.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        organization: user.organization,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified
      },
      accessLevel: userRole === 'superAdmin' ? 'full' : userRole === 'admin' ? 'admin' : userRole === 'police' ? 'police' : 'restricted',
      emailConfirmation: {
        sent: true,
        message: `Verification email sent to ${email}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        resendAvailable: true,
        verificationToken: verificationToken // In production, this would be sent via email
      },
      nextSteps: [
        'Check your email for verification link',
        'Click the verification link to activate your account',
        'If no email received, check spam folder',
        'Use the verification token below to verify manually',
        'Contact support if verification fails'
      ],
      manualVerification: {
        token: verificationToken,
        instructions: 'Copy this token and use it on the verification page if email is not received'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ 
      error: 'Internal server error during registration' 
    })
  }
}
