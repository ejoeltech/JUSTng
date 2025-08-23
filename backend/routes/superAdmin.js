import express from 'express'
import { body, validationResult } from 'express-validator'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '../middleware/auth.js'

const router = express.Router()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Validation middleware
const validateAppSettings = [
  body('app_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('App name must be between 1 and 100 characters'),
  body('app_version').optional().trim().isLength({ min: 1, max: 20 }).withMessage('App version must be between 1 and 20 characters'),
  body('maintenance_mode').optional().isBoolean().withMessage('Maintenance mode must be a boolean'),
  body('maintenance_message').optional().trim().isLength({ max: 500 }).withMessage('Maintenance message must be less than 500 characters'),
  body('announcements').optional().isArray().withMessage('Announcements must be an array'),
  body('feature_flags').optional().isObject().withMessage('Feature flags must be an object'),
  body('system_config').optional().isObject().withMessage('System config must be an object')
]

const validateAnnouncement = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Content must be between 1 and 1000 characters'),
  body('type').isIn(['info', 'warning', 'error', 'success']).withMessage('Type must be info, warning, error, or success'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Priority must be low, medium, high, or urgent'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  body('expires_at').optional().isISO8601().withMessage('Expires at must be a valid date')
]

// Get system-wide statistics
router.get('/stats', requireSuperAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query
    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // System-wide incident statistics
    const { count: totalIncidents } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })

    const { count: recentIncidents } = await supabase
      .from('incidents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    // User growth statistics
    const { count: totalUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    const { count: newUsers } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())

    // Storage usage
    const { data: storageBuckets } = await supabase.storage.listBuckets()
    let totalStorageSize = 0
    let bucketCounts = {}

    for (const bucket of storageBuckets || []) {
      const { data: files } = await supabase.storage
        .from(bucket.name)
        .list('', { limit: 1000 })

      const bucketSize = files?.reduce((acc, file) => acc + (file.metadata?.size || 0), 0) || 0
      totalStorageSize += bucketSize
      bucketCounts[bucket.name] = {
        fileCount: files?.length || 0,
        size: bucketSize
      }
    }

    // System performance metrics
    const { data: performanceData } = await supabase
      .from('incidents')
      .select('created_at, resolved_at, status')
      .gte('created_at', startDate.toISOString())

    const avgResponseTime = performanceData
      .filter(incident => incident.resolved_at && incident.status === 'resolved')
      .map(incident => {
        const created = new Date(incident.created_at)
        const resolved = new Date(incident.resolved_at)
        return Math.floor((resolved - created) / (1000 * 60 * 60 * 24))
      })
      .reduce((acc, time) => acc + time, 0) / Math.max(performanceData.length, 1)

    res.json({
      stats: {
        incidents: {
          total: totalIncidents,
          recent: recentIncidents,
          avgResponseTime: Math.round(avgResponseTime)
        },
        users: {
          total: totalUsers,
          new: newUsers,
          growthRate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : 0
        },
        storage: {
          totalSize: totalStorageSize,
          buckets: bucketCounts,
          totalBuckets: storageBuckets?.length || 0
        },
        period: days
      }
    })

  } catch (error) {
    console.error('Error fetching super admin stats:', error)
    res.status(500).json({
      error: 'Failed to fetch super admin stats',
      message: error.message
    })
  }
})

// Get app settings
router.get('/settings', requireSuperAdmin, async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('*')
      .single()

    if (error) throw error

    res.json({ settings })

  } catch (error) {
    console.error('Error fetching app settings:', error)
    res.status(500).json({
      error: 'Failed to fetch app settings',
      message: error.message
    })
  }
})

// Update app settings
router.put('/settings', requireSuperAdmin, validateAppSettings, async (req, res) => {
  try {
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
    updateData.updated_at = new Date().toISOString()
    updateData.updated_by = req.user.id

    const { data: settings, error } = await supabase
      .from('app_settings')
      .update(updateData)
      .eq('id', 1) // Assuming single row for app settings
      .select()
      .single()

    if (error) throw error

    res.json({
      message: 'App settings updated successfully',
      settings
    })

  } catch (error) {
    console.error('Error updating app settings:', error)
    res.status(500).json({
      error: 'Failed to update app settings',
      message: error.message
    })
  }
})

// Toggle maintenance mode
router.patch('/maintenance', requireSuperAdmin, async (req, res) => {
  try {
    const { enabled, message } = req.body

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'enabled must be a boolean'
      })
    }

    const updateData = {
      maintenance_mode: enabled,
      maintenance_message: message || 'System is under maintenance. Please try again later.',
      updated_at: new Date().toISOString(),
      updated_by: req.user.id
    }

    const { data: settings, error } = await supabase
      .from('app_settings')
      .update(updateData)
      .eq('id', 1)
      .select()
      .single()

    if (error) throw error

    res.json({
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
      settings
    })

  } catch (error) {
    console.error('Error toggling maintenance mode:', error)
    res.status(500).json({
      error: 'Failed to toggle maintenance mode',
      message: error.message
    })
  }
})

// Create announcement
router.post('/announcements', requireSuperAdmin, validateAnnouncement, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      })
    }

    const announcementData = {
      ...req.body,
      created_by: req.user.id,
      created_at: new Date().toISOString()
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert([announcementData])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement
    })

  } catch (error) {
    console.error('Error creating announcement:', error)
    res.status(500).json({
      error: 'Failed to create announcement',
      message: error.message
    })
  }
})

// Get all announcements
router.get('/announcements', requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, is_active } = req.query

    let query = supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (type) query = query.eq('type', type)
    if (typeof is_active === 'boolean') query = query.eq('is_active', is_active)

    // Get total count for pagination
    const { count } = await query.count()

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: announcements, error } = await query

    if (error) throw error

    res.json({
      announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching announcements:', error)
    res.status(500).json({
      error: 'Failed to fetch announcements',
      message: error.message
    })
  }
})

// Update announcement
router.put('/announcements/:id', requireSuperAdmin, validateAnnouncement, async (req, res) => {
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
    updateData.updated_at = new Date().toISOString()
    updateData.updated_by = req.user.id

    const { data: announcement, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({
      message: 'Announcement updated successfully',
      announcement
    })

  } catch (error) {
    console.error('Error updating announcement:', error)
    res.status(500).json({
      error: 'Failed to update announcement',
      message: error.message
    })
  }
})

// Delete announcement
router.delete('/announcements/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({
      message: 'Announcement deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting announcement:', error)
    res.status(500).json({
      error: 'Failed to delete announcement',
      message: error.message
    })
  }
})

// Get system logs
router.get('/logs', requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 100, level, start_date, end_date } = req.query

    // For now, we'll return a placeholder since we haven't implemented logging yet
    // TODO: Implement proper logging system
    const mockLogs = [
      {
        id: 1,
        level: 'info',
        message: 'System started successfully',
        timestamp: new Date().toISOString(),
        user_id: null,
        metadata: {}
      }
    ]

    res.json({
      logs: mockLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: mockLogs.length,
        pages: 1
      },
      note: 'Logging system not yet implemented'
    })

  } catch (error) {
    console.error('Error fetching system logs:', error)
    res.status(500).json({
      error: 'Failed to fetch system logs',
      message: error.message
    })
  }
})

// Database backup configuration
router.post('/backup/config', requireSuperAdmin, async (req, res) => {
  try {
    const { schedule, retention_days, backup_type } = req.body

    // This would typically integrate with Supabase's backup system
    // For now, we'll store the configuration in app_settings
    const backupConfig = {
      schedule: schedule || 'daily',
      retention_days: retention_days || 30,
      backup_type: backup_type || 'full',
      enabled: true,
      last_backup: null,
      next_backup: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
    }

    const { data: settings, error } = await supabase
      .from('app_settings')
      .update({
        backup_config: backupConfig,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      })
      .eq('id', 1)
      .select()
      .single()

    if (error) throw error

    res.json({
      message: 'Backup configuration updated successfully',
      backup_config: backupConfig
    })

  } catch (error) {
    console.error('Error updating backup config:', error)
    res.status(500).json({
      error: 'Failed to update backup configuration',
      message: error.message
    })
  }
})

// Get backup status
router.get('/backup/status', requireSuperAdmin, async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('backup_config')
      .single()

    if (error) throw error

    const backupConfig = settings?.backup_config || {}
    
    res.json({
      backup_status: {
        enabled: backupConfig.enabled || false,
        schedule: backupConfig.schedule || 'daily',
        last_backup: backupConfig.last_backup,
        next_backup: backupConfig.next_backup,
        retention_days: backupConfig.retention_days || 30
      }
    })

  } catch (error) {
    console.error('Error fetching backup status:', error)
    res.status(500).json({
      error: 'Failed to fetch backup status',
      message: error.message
    })
  }
})

// System diagnostics
router.get('/diagnostics', requireSuperAdmin, async (req, res) => {
  try {
    // Database health
    const { data: dbHealth, error: dbError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })

    // Storage health
    const { data: storageBuckets, error: storageError } = await supabase.storage.listBuckets()

    // Auth health
    const { data: authHealth, error: authError } = await supabase.auth.admin.listUsers()

    // Performance metrics
    const startTime = Date.now()
    const { data: performanceTest, error: perfError } = await supabase
      .from('incidents')
      .select('id')
      .limit(1)
    const responseTime = Date.now() - startTime

    const diagnostics = {
      database: {
        status: dbError ? 'error' : 'healthy',
        error: dbError?.message,
        connection: 'active'
      },
      storage: {
        status: storageError ? 'error' : 'healthy',
        buckets: storageBuckets?.length || 0,
        error: storageError?.message
      },
      auth: {
        status: authError ? 'error' : 'healthy',
        error: authError?.message,
        users_count: authHealth?.users?.length || 0
      },
      performance: {
        response_time: responseTime,
        status: responseTime < 1000 ? 'good' : responseTime < 3000 ? 'acceptable' : 'poor'
      },
      timestamp: new Date().toISOString()
    }

    const overallStatus = Object.values(diagnostics)
      .filter(val => typeof val === 'object' && val.status)
      .every(val => val.status === 'healthy' || val.status === 'good' || val.status === 'acceptable')
      ? 'healthy' : 'degraded'

    res.json({
      status: overallStatus,
      diagnostics
    })

  } catch (error) {
    console.error('Error running diagnostics:', error)
    res.status(500).json({
      error: 'Failed to run diagnostics',
      message: error.message
    })
  }
})

export default router
