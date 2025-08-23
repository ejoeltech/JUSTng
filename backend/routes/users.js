import express from 'express'
import { body, validationResult } from 'express-validator'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../middleware/auth.js'

const router = express.Router()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Validation middleware
const validateProfileUpdate = [
  body('full_name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  body('phone').optional().matches(/^(\+234|0)[789][01]\d{8}$/).withMessage('Invalid Nigerian phone number format'),
  body('state_id').optional().isInt().withMessage('Invalid state ID'),
  body('lga_id').optional().isInt().withMessage('Invalid LGA ID'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
  body('emergency_contact').optional().trim().isLength({ max: 100 }).withMessage('Emergency contact must be less than 100 characters'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object')
]

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        states(name, code),
        lgas(name)
      `)
      .eq('id', userId)
      .single()

    if (error) throw error

    res.json({ profile })

  } catch (error) {
    console.error('Error fetching user profile:', error)
    res.status(500).json({
      error: 'Failed to fetch user profile',
      message: error.message
    })
  }
})

// Update current user profile
router.put('/profile', validateProfileUpdate, async (req, res) => {
  try {
    const userId = req.user.id

    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      })
    }

    const updateData = { ...req.body }
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.id
    delete updateData.email
    delete updateData.role
    delete updateData.created_at
    delete updateData.updated_at

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select(`
        *,
        states(name, code),
        lgas(name)
      `)
      .single()

    if (error) throw error

    res.json({
      message: 'Profile updated successfully',
      profile
    })

  } catch (error) {
    console.error('Error updating user profile:', error)
    res.status(500).json({
      error: 'Failed to update user profile',
      message: error.message
    })
  }
})

// Get user's incidents
router.get('/incidents', async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 20, status } = req.query

    let query = supabase
      .from('incidents')
      .select(`
        *,
        states(name, code),
        lgas(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    // Get total count for pagination
    const { count } = await query.count()

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: incidents, error } = await query

    if (error) throw error

    res.json({
      incidents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching user incidents:', error)
    res.status(500).json({
      error: 'Failed to fetch user incidents',
      message: error.message
    })
  }
})

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id

    // Get total incidents
    const { count: totalIncidents } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get incidents by status
    const { data: statusStats } = await supabase
      .from('incidents')
      .select('status')
      .eq('user_id', userId)

    const statusCounts = statusStats.reduce((acc, incident) => {
      acc[incident.status] = (acc[incident.status] || 0) + 1
      return acc
    }, {})

    // Get incidents by severity
    const { data: severityStats } = await supabase
      .from('incidents')
      .select('severity')
      .eq('user_id', userId)

    const severityCounts = severityStats.reduce((acc, incident) => {
      acc[incident.severity] = (acc[incident.severity] || 0) + 1
      return acc
    }, {})

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: recentActivity } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())

    res.json({
      stats: {
        totalIncidents,
        statusCounts,
        severityCounts,
        recentActivity
      }
    })

  } catch (error) {
    console.error('Error fetching user stats:', error)
    res.status(500).json({
      error: 'Failed to fetch user stats',
      message: error.message
    })
  }
})

// Admin routes (require admin role)
// Get all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      status,
      search
    } = req.query

    let query = supabase
      .from('user_profiles')
      .select(`
        *,
        states(name, code),
        lgas(name)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (role) query = query.eq('role', role)
    if (status) query = query.eq('status', status)
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Get total count for pagination
    const { count } = await query.count()

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: users, error } = await query

    if (error) throw error

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    })
  }
})

// Get user by ID (admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const { data: user, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        states(name, code),
        lgas(name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user does not exist'
        })
      }
      throw error
    }

    res.json({ user })

  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error.message
    })
  }
})

// Update user role (admin only)
router.patch('/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!role || !['user', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be user, admin, or superadmin'
      })
    }

    // Prevent admin from changing their own role to non-admin
    if (id === req.user.id && role !== 'admin' && role !== 'superadmin') {
      return res.status(400).json({
        error: 'Cannot change own role',
        message: 'You cannot change your own role to a lower level'
      })
    }

    const { data: user, error } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({
      message: 'User role updated successfully',
      user
    })

  } catch (error) {
    console.error('Error updating user role:', error)
    res.status(500).json({
      error: 'Failed to update user role',
      message: error.message
    })
  }
})

// Update user status (admin only)
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status || !['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be active, suspended, or banned'
      })
    }

    // Prevent admin from suspending/banning themselves
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot change own status',
        message: 'You cannot change your own status'
      })
    }

    const { data: user, error } = await supabase
      .from('user_profiles')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({
      message: 'User status updated successfully',
      user
    })

  } catch (error) {
    console.error('Error updating user status:', error)
    res.status(500).json({
      error: 'Failed to update user status',
      message: error.message
    })
  }
})

// Delete user (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot delete own account',
        message: 'You cannot delete your own account'
      })
    }

    // Check if user has any incidents
    const { count: incidentCount } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id)

    if (incidentCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete user',
        message: 'User has incidents and cannot be deleted. Consider suspending instead.'
      })
    }

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({
      error: 'Failed to delete user',
      message: error.message
    })
  }
})

export default router
