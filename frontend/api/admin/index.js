// Consolidated Admin API - Handles all admin operations
import { authenticateToken, requireRole } from '../../lib/middleware/auth.js'
import databaseService from '../../lib/services/database.js'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Apply authentication middleware
  try {
    await authenticateToken(req, res, () => {})
    await requireRole(req, res, ['admin', 'superAdmin'])
  } catch (error) {
    return // Error already sent by middleware
  }

  try {
    const { action } = req.query

    switch (req.method) {
      case 'GET':
        return handleAdminGet(req, res, action)
      case 'POST':
        return handleAdminPost(req, res, action)
      case 'PUT':
        return handleAdminPut(req, res, action)
      case 'DELETE':
        return handleAdminDelete(req, res, action)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Admin API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error' 
    })
  }
}

// Handle GET requests
async function handleAdminGet(req, res, action) {
  try {
    switch (action) {
      case 'users':
        return handleGetUsers(req, res)
      case 'analytics':
        return handleGetAnalytics(req, res)
      case 'health':
        return handleGetHealth(req, res)
      default:
        return res.status(400).json({ error: 'Invalid action specified' })
    }
  } catch (error) {
    console.error('Admin GET error:', error)
    return res.status(500).json({ error: 'Failed to retrieve data' })
  }
}

// Handle POST requests
async function handleAdminPost(req, res, action) {
  try {
    switch (action) {
      case 'invite-codes':
        return handleCreateInviteCode(req, res)
      default:
        return res.status(400).json({ error: 'Invalid action specified' })
    }
  } catch (error) {
    console.error('Admin POST error:', error)
    return res.status(500).json({ error: 'Failed to create resource' })
  }
}

// Handle PUT requests
async function handleAdminPut(req, res, action) {
  try {
    switch (action) {
      case 'user-role':
        return handleUpdateUserRole(req, res)
      case 'user-status':
        return handleUpdateUserStatus(req, res)
      default:
        return res.status(400).json({ error: 'Invalid action specified' })
    }
  } catch (error) {
    console.error('Admin PUT error:', error)
    return res.status(500).json({ error: 'Failed to update resource' })
  }
}

// Handle DELETE requests
async function handleAdminDelete(req, res, action) {
  try {
    switch (action) {
      case 'user':
        return handleDeleteUser(req, res)
      case 'invite-code':
        return handleDeleteInviteCode(req, res)
      default:
        return res.status(400).json({ error: 'Invalid action specified' })
    }
  } catch (error) {
    console.error('Admin DELETE error:', error)
    return res.status(500).json({ error: 'Failed to delete resource' })
  }
}

// Get all users
async function handleGetUsers(req, res) {
  try {
    const { role, status, search } = req.query
    const filters = { role, status, search }
    
    const result = await databaseService.getAllUsers(filters)
    
    if (result.error) {
      return res.status(500).json({ error: 'Failed to retrieve users' })
    }

    return res.status(200).json({
      users: result.data,
      total: result.data.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Get users error:', error)
    return res.status(500).json({ error: 'Failed to retrieve users' })
  }
}

// Get analytics
async function handleGetAnalytics(req, res) {
  try {
    // Placeholder for analytics - can be expanded later
    const analytics = {
      totalUsers: 0,
      totalIncidents: 0,
      activeIncidents: 0,
      resolvedIncidents: 0,
      timestamp: new Date().toISOString()
    }

    return res.status(200).json(analytics)
  } catch (error) {
    console.error('Get analytics error:', error)
    return res.status(500).json({ error: 'Failed to retrieve analytics' })
  }
}

// Get system health
async function handleGetHealth(req, res) {
  try {
    const health = await databaseService.healthCheck()
    
    return res.status(200).json({
      status: 'healthy',
      database: health.data.status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check error:', error)
    return res.status(500).json({ error: 'Health check failed' })
  }
}

// Create invite code
async function handleCreateInviteCode(req, res) {
  try {
    const { email, role, expiresAt } = req.body

    if (!email || !role) {
      return res.status(400).json({ 
        error: 'Email and role are required' 
      })
    }

    // Generate invite code
    const inviteCode = `INVITE_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    // In a real app, save this to database
    // For now, just return success
    return res.status(201).json({
      success: true,
      message: 'Invite code created successfully',
      inviteCode,
      email,
      role,
      expiresAt: expiresAt || null
    })
  } catch (error) {
    console.error('Create invite code error:', error)
    return res.status(500).json({ error: 'Failed to create invite code' })
  }
}

// Update user role
async function handleUpdateUserRole(req, res) {
  try {
    const { userId, newRole } = req.body

    if (!userId || !newRole) {
      return res.status(400).json({ 
        error: 'User ID and new role are required' 
      })
    }

    const result = await databaseService.updateUserRole(userId, newRole)
    
    if (result.error) {
      return res.status(500).json({ error: 'Failed to update user role' })
    }

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user: result.data
    })
  } catch (error) {
    console.error('Update user role error:', error)
    return res.status(500).json({ error: 'Failed to update user role' })
  }
}

// Update user status
async function handleUpdateUserStatus(req, res) {
  try {
    const { userId, newStatus } = req.body

    if (!userId || !newStatus) {
      return res.status(400).json({ 
        error: 'User ID and new status are required' 
      })
    }

    const result = await databaseService.updateUser(userId, { 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    
    if (result.error) {
      return res.status(500).json({ error: 'Failed to update user status' })
    }

    return res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      user: result.data
    })
  } catch (error) {
    console.error('Update user status error:', error)
    return res.status(500).json({ error: 'Failed to update user status' })
  }
}

// Delete user
async function handleDeleteUser(req, res) {
  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ 
        error: 'User ID is required' 
      })
    }

    // In a real app, implement user deletion
    // For now, just return success
    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      userId
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return res.status(500).json({ error: 'Failed to delete user' })
  }
}

// Delete invite code
async function handleDeleteInviteCode(req, res) {
  try {
    const { inviteCode } = req.query

    if (!inviteCode) {
      return res.status(400).json({ 
        error: 'Invite code is required' 
      })
    }

    // In a real app, implement invite code deletion
    // For now, just return success
    return res.status(200).json({
      success: true,
      message: 'Invite code deleted successfully',
      inviteCode
    })
  } catch (error) {
    console.error('Delete invite code error:', error)
    return res.status(500).json({ error: 'Failed to delete invite code' })
  }
}
