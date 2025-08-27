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

    // Validate invite code format (should be alphanumeric, 8-16 characters)
    if (!/^[A-Za-z0-9]{8,16}$/.test(inviteCode)) {
      return res.status(400).json({ 
        error: 'Invalid invite code format' 
      })
    }

    // Check if invite code is valid (you can expand this list)
    const validInviteCodes = [
      'JUST2024', 'POLICE001', 'ADMIN2024', 'SUPER2024',
      'NIGERIA1', 'SECURITY1', 'MONITOR1', 'REPORT1'
    ]

    if (!validInviteCodes.includes(inviteCode)) {
      return res.status(403).json({ 
        error: 'Invalid or expired invite code. Please contact an administrator.' 
      })
    }

    // Determine user role based on invite code
    let userRole = 'user' // default role
    if (inviteCode === 'ADMIN2024') userRole = 'admin'
    if (inviteCode === 'SUPER2024') userRole = 'superAdmin'
    if (inviteCode === 'POLICE001') userRole = 'police'

    // Validate email domain (optional - restrict to specific domains)
    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
    const emailDomain = email.split('@')[1]
    
    if (!allowedDomains.includes(emailDomain)) {
      return res.status(400).json({ 
        error: 'Please use a valid email domain' 
      })
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      })
    }

    // Check if user already exists (in production, this would check database)
    // For now, we'll simulate this check

    // Success response
    return res.status(200).json({
      message: 'Registration successful! Account created with restricted access.',
      user: {
        email,
        fullName,
        phone: phone || null,
        organization: organization || 'Nigerian Police Monitoring',
        role: userRole,
        id: 'user-' + Date.now(),
        inviteCode: inviteCode,
        status: 'pending_verification'
      },
      accessLevel: userRole === 'superAdmin' ? 'full' : 
                   userRole === 'admin' ? 'admin' : 
                   userRole === 'police' ? 'police' : 'restricted',
      timestamp: new Date().toISOString(),
      nextSteps: [
        'Account requires email verification',
        'Admin approval may be required',
        'Access will be granted after verification'
      ]
    })

  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
