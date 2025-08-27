// Admin endpoint for managing invite codes
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Check if user is admin (in production, verify JWT token)
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  try {
    if (req.method === 'GET') {
      // List all invite codes
      const inviteCodes = [
        {
          code: 'JUST2024',
          role: 'user',
          maxUses: 100,
          usedCount: 45,
          expiresAt: '2024-12-31',
          createdBy: 'superAdmin',
          status: 'active'
        },
        {
          code: 'ADMIN2024',
          role: 'admin',
          maxUses: 5,
          usedCount: 2,
          expiresAt: '2024-12-31',
          createdBy: 'superAdmin',
          status: 'active'
        },
        {
          code: 'POLICE001',
          role: 'police',
          maxUses: 50,
          usedCount: 12,
          expiresAt: '2024-12-31',
          createdBy: 'superAdmin',
          status: 'active'
        }
      ]

      return res.status(200).json({
        message: 'Invite codes retrieved successfully',
        inviteCodes,
        totalActive: inviteCodes.filter(ic => ic.status === 'active').length,
        totalUsed: inviteCodes.reduce((sum, ic) => sum + ic.usedCount, 0)
      })

    } else if (req.method === 'POST') {
      // Create new invite code
      const { code, role, maxUses, expiresAt } = req.body

      if (!code || !role || !maxUses) {
        return res.status(400).json({ 
          error: 'Code, role, and maxUses are required' 
        })
      }

      // Validate code format
      if (!/^[A-Za-z0-9]{8,16}$/.test(code)) {
        return res.status(400).json({ 
          error: 'Invalid code format. Must be 8-16 alphanumeric characters.' 
        })
      }

      // Validate role
      const validRoles = ['user', 'admin', 'police', 'superAdmin']
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          error: 'Invalid role. Must be one of: user, admin, police, superAdmin' 
        })
      }

      return res.status(201).json({
        message: 'Invite code created successfully',
        inviteCode: {
          code,
          role,
          maxUses: parseInt(maxUses),
          usedCount: 0,
          expiresAt: expiresAt || '2024-12-31',
          createdBy: 'admin',
          status: 'active',
          createdAt: new Date().toISOString()
        }
      })

    } else if (req.method === 'PUT') {
      // Update invite code (revoke, extend expiry, etc.)
      const { code, action } = req.body

      if (!code || !action) {
        return res.status(400).json({ 
          error: 'Code and action are required' 
        })
      }

      const validActions = ['revoke', 'activate', 'extend']
      if (!validActions.includes(action)) {
        return res.status(400).json({ 
          error: 'Invalid action. Must be one of: revoke, activate, extend' 
        })
      }

      return res.status(200).json({
        message: `Invite code ${code} ${action}d successfully`,
        code,
        action,
        updatedAt: new Date().toISOString()
      })

    } else if (req.method === 'DELETE') {
      // Delete invite code
      const { code } = req.body

      if (!code) {
        return res.status(400).json({ 
          error: 'Code is required' 
        })
      }

      return res.status(200).json({
        message: `Invite code ${code} deleted successfully`,
        code,
        deletedAt: new Date().toISOString()
      })

    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Invite code management error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
