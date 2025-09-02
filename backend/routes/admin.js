import express from 'express'
import { body, validationResult } from 'express-validator'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../middleware/auth.js'

const router = express.Router()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Validation middleware
const validateIncidentUpdate = [
  body('status').optional().isIn(['reported', 'investigating', 'resolved', 'closed', 'dismissed']).withMessage('Invalid status'),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
  body('admin_notes').optional().trim().isLength({ max: 1000 }).withMessage('Admin notes must be less than 1000 characters'),
  body('assigned_officer').optional().trim().isLength({ max: 100 }).withMessage('Assigned officer must be less than 100 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority level')
]

// Get admin dashboard statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query // days
    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Total incidents
    const { count: totalIncidents } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })

    // Recent incidents
    const { count: recentIncidents } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    // Incidents by status
    const { data: statusStats } = await supabase
      .from('incidents')
      .select('status')
      .gte('created_at', startDate.toISOString())

    const statusCounts = statusStats.reduce((acc, incident) => {
      acc[incident.status] = (acc[incident.status] || 0) + 1
      return acc
    }, {})

    // Incidents by severity
    const { data: severityStats } = await supabase
      .from('incidents')
      .select('severity')
      .gte('created_at', startDate.toISOString())

    const severityCounts = severityStats.reduce((acc, incident) => {
      acc[incident.severity] = (acc[incident.severity] || 0) + 1
      return acc
    }, {})

    // Incidents by state
    const { data: stateStats } = await supabase
      .from('incidents')
      .select(`
        states(name, code),
        count
      `)
      .gte('created_at', startDate.toISOString())

    const stateCounts = stateStats.reduce((acc, incident) => {
      const stateName = incident.states?.name || 'Unknown'
      acc[stateName] = (acc[stateName] || 0) + 1
      return acc
    }, {})

    // Total users
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    // Active users (last 30 days)
    const { count: activeUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login', startDate.toISOString())

    // Users by role
    const { data: roleStats } = await supabase
      .from('user_profiles')
      .select('role')

    const roleCounts = roleStats.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})

    res.json({
      stats: {
        incidents: {
          total: totalIncidents,
          recent: recentIncidents,
          byStatus: statusCounts,
          bySeverity: severityCounts,
          byState: stateCounts
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: roleCounts
        },
        period: days
      }
    })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    res.status(500).json({
      error: 'Failed to fetch admin stats',
      message: error.message
    })
  }
})

// Get incidents for admin review
router.get('/incidents', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      state_id,
      lga_id,
      incident_type,
      priority,
      assigned_officer,
      start_date,
      end_date,
      search
    } = req.query

    let query = supabase
      .from('incidents')
      .select(`
        *,
        user_profiles!inner(full_name, email, phone),
        states(name, code),
        lgas(name)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) query = query.eq('status', status)
    if (severity) query = query.eq('severity', severity)
    if (state_id) query = query.eq('state_id', state_id)
    if (lga_id) query = query.eq('lga_id', lga_id)
    if (incident_type) query = query.eq('incident_type', incident_type)
    if (priority) query = query.eq('priority', priority)
    if (assigned_officer) query = query.eq('assigned_officer', assigned_officer)
    if (start_date) query = query.gte('incident_date', start_date)
    if (end_date) query = query.lte('incident_date', end_date)
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
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
    console.error('Error fetching admin incidents:', error)
    res.status(500).json({
      error: 'Failed to fetch admin incidents',
      message: error.message
    })
  }
})

// Update incident (admin only)
router.put('/incidents/:id', requireAdmin, validateIncidentUpdate, async (req, res) => {
  try {
    const { id } = req.params

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
    updateData.admin_updated_at = new Date().toISOString()
    updateData.admin_updated_by = req.user.id

    const { data: incident, error } = await supabase
      .from('incidents')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        user_profiles!inner(full_name, email, phone),
        states(name, code),
        lgas(name)
      `)
      .single()

    if (error) throw error

    // Create admin update record
    await supabase
      .from('incident_updates')
      .insert([{
        incident_id: id,
        user_id: req.user.id,
        update_type: 'admin_update',
        content: `Admin updated incident: ${Object.keys(updateData).join(', ')}`,
        metadata: { admin_update: true, updated_fields: Object.keys(updateData) }
      }])

    res.json({
      message: 'Incident updated successfully',
      incident
    })

  } catch (error) {
    console.error('Error updating incident:', error)
    res.status(500).json({
      error: 'Failed to update incident',
      message: error.message
    })
  }
})

// Assign incident to officer
router.patch('/incidents/:id/assign', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { assigned_officer, priority, notes } = req.body

    if (!assigned_officer) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'assigned_officer is required'
      })
    }

    const updateData = {
      assigned_officer,
      priority: priority || 'medium',
      admin_notes: notes,
      admin_updated_at: new Date().toISOString(),
      admin_updated_by: req.user.id
    }

    const { data: incident, error } = await supabase
      .from('incidents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Create assignment update record
    await supabase
      .from('incident_updates')
      .insert([{
        incident_id: id,
        user_id: req.user.id,
        update_type: 'assignment',
        content: `Incident assigned to ${assigned_officer}`,
        metadata: { 
          assigned_officer,
          priority,
          admin_notes: notes
        }
      }])

    res.json({
      message: 'Incident assigned successfully',
      incident
    })

  } catch (error) {
    console.error('Error assigning incident:', error)
    res.status(500).json({
      error: 'Failed to assign incident',
      message: error.message
    })
  }
})

// Change incident status
router.patch('/incidents/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status, notes } = req.body

    if (!status) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'status is required'
      })
    }

    const validStatuses = ['reported', 'investigating', 'resolved', 'closed', 'dismissed']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      })
    }

    const updateData = {
      status,
      admin_notes: notes,
      admin_updated_at: new Date().toISOString(),
      admin_updated_by: req.user.id
    }

    const { data: incident, error } = await supabase
      .from('incidents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Create status change update record
    await supabase
      .from('incident_updates')
      .insert([{
        incident_id: id,
        user_id: req.user.id,
        update_type: 'status_change',
        content: `Status changed to ${status}`,
        metadata: { 
          previous_status: incident.status,
          new_status: status,
          admin_notes: notes
        }
      }])

    res.json({
      message: 'Incident status updated successfully',
      incident
    })

  } catch (error) {
    console.error('Error updating incident status:', error)
    res.status(500).json({
      error: 'Failed to update incident status',
      message: error.message
    })
  }
})

// Get incident analytics
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { period = '30', group_by = 'day' } = req.query
    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Incidents over time
    const { data: timeSeriesData } = await supabase
      .from('incidents')
      .select('created_at, status, severity')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    // Group by day, week, or month
    const groupedData = {}
    timeSeriesData.forEach(incident => {
      let key
      const date = new Date(incident.created_at)
      
      if (group_by === 'day') {
        key = date.toISOString().split('T')[0]
      } else if (group_by === 'week') {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split('T')[0]
      } else if (group_by === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }

      if (!groupedData[key]) {
        groupedData[key] = { total: 0, byStatus: {}, bySeverity: {} }
      }

      groupedData[key].total++
      
      // Count by status
      if (!groupedData[key].byStatus[incident.status]) {
        groupedData[key].byStatus[incident.status] = 0
      }
      groupedData[key].byStatus[incident.status]++

      // Count by severity
      if (!groupedData[key].bySeverity[incident.severity]) {
        groupedData[key].bySeverity[incident.severity] = 0
      }
      groupedData[key].bySeverity[incident.severity]++
    })

    // Top states by incidents
    const { data: topStates } = await supabase
      .from('incidents')
      .select(`
        states(name, code),
        count
      `)
      .gte('created_at', startDate.toISOString())

    const stateCounts = topStates.reduce((acc, incident) => {
      const stateName = incident.states?.name || 'Unknown'
      acc[stateName] = (acc[stateName] || 0) + 1
      return acc
    }, {})

    const topStatesList = Object.entries(stateCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // Response time analysis (if we have resolution data)
    const { data: resolutionData } = await supabase
      .from('incidents')
      .select('created_at, resolved_at')
      .eq('status', 'resolved')
      .gte('created_at', startDate.toISOString())

    const responseTimes = resolutionData
      .filter(incident => incident.resolved_at)
      .map(incident => {
        const created = new Date(incident.created_at)
        const resolved = new Date(incident.resolved_at)
        return Math.floor((resolved - created) / (1000 * 60 * 60 * 24)) // days
      })

    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0

    res.json({
      analytics: {
        timeSeries: groupedData,
        topStates: topStatesList,
        responseTime: {
          average: avgResponseTime,
          total: responseTimes.length
        },
        period: days,
        groupBy: group_by
      }
    })

  } catch (error) {
    console.error('Error fetching analytics:', error)
    res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message
    })
  }
})

// Get system health
router.get('/health', requireAdmin, async (req, res) => {
  try {
    // Check database connection
    const { data: dbCheck, error: dbError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })

    // Check storage buckets
    const { data: storageBuckets, error: storageError } = await supabase.storage.listBuckets()

    // Check recent errors (if we have a logging system)
    const recentErrors = [] // TODO: Implement error logging

    const healthStatus = {
      database: {
        status: dbError ? 'error' : 'healthy',
        error: dbError?.message
      },
      storage: {
        status: storageError ? 'error' : 'healthy',
        buckets: storageBuckets?.length || 0,
        error: storageError?.message
      },
      errors: {
        count: recentErrors.length,
        recent: recentErrors.slice(0, 5)
      },
      timestamp: new Date().toISOString()
    }

    const overallStatus = healthStatus.database.status === 'healthy' && 
                         healthStatus.storage.status === 'healthy' ? 'healthy' : 'degraded'

    res.json({
      status: overallStatus,
      details: healthStatus
    })

  } catch (error) {
    console.error('Error checking system health:', error)
    res.status(500).json({
      error: 'Failed to check system health',
      message: error.message
    })
  }
})

// Get all users for admin management
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { search = '', role = '', status = '', page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let query = supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        email,
        phone,
        role,
        status,
        created_at,
        last_login,
        location,
        avatar_url,
        email_verified,
        profile_completed
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (role && role !== 'all') {
      query = query.eq('role', role)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Get total count for pagination
    const { count: totalCount } = await query.count()

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: users, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return res.status(500).json({
        error: 'Failed to fetch users',
        message: error.message
      })
    }

    // Get incident count for each user
    const usersWithIncidentCount = await Promise.all(
      users.map(async (user) => {
        const { count: incidentCount } = await supabase
          .from('incidents')
          .select('*', { count: 'exact', head: true })
          .eq('reporter_id', user.id)

        return {
          ...user,
          incident_count: incidentCount || 0
        }
      })
    )

    res.json({
      users: usersWithIncidentCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
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

// Update user role (admin only)
router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!role || !['user', 'admin', 'superadmin', 'police'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be user, admin, superadmin, or police'
      })
    }

    // Prevent admin from changing their own role to non-admin
    if (id === req.user.id && role !== 'admin' && role !== 'superadmin') {
      return res.status(400).json({
        error: 'Cannot change own role',
        message: 'You cannot change your own role to a non-admin role'
      })
    }

    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user role:', error)
      return res.status(500).json({
        error: 'Failed to update user role',
        message: error.message
      })
    }

    res.json({
      message: 'User role updated successfully',
      user: updatedUser
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
router.patch('/users/:id/status', requireAdmin, async (req, res) => {
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
        message: 'You cannot suspend or ban yourself'
      })
    }

    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user status:', error)
      return res.status(500).json({
        error: 'Failed to update user status',
        message: error.message
      })
    }

    res.json({
      message: 'User status updated successfully',
      user: updatedUser
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
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        error: 'Cannot delete own account',
        message: 'You cannot delete your own account'
      })
    }

    // Check if user has incidents
    const { count: incidentCount } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_id', id)

    if (incidentCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete user with incidents',
        message: `User has ${incidentCount} incident(s). Please handle incidents before deletion.`
      })
    }

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting user:', error)
      return res.status(500).json({
        error: 'Failed to delete user',
        message: error.message
      })
    }

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

// Save system configuration
router.post('/settings', requireAdmin, async (req, res) => {
  try {
    const { section, config } = req.body

    if (!section || !config) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Section and config are required'
      })
    }

    // Validate section
    const validSections = ['appSettings', 'notificationSettings', 'securitySettings', 'performanceSettings']
    if (!validSections.includes(section)) {
      return res.status(400).json({
        error: 'Invalid section',
        message: 'Section must be one of: appSettings, notificationSettings, securitySettings, performanceSettings'
      })
    }

    // Here you would typically save to a database or configuration file
    // For now, we'll just return success
    // TODO: Implement actual configuration persistence
    
    console.log(`Saving ${section} configuration:`, config)

    res.json({
      message: `${section} configuration saved successfully`,
      section,
      config
    })

  } catch (error) {
    console.error('Error saving system configuration:', error)
    res.status(500).json({
      error: 'Failed to save system configuration',
      message: error.message
    })
  }
})

export default router
