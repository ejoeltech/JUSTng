import express from 'express'
import { body, validationResult } from 'express-validator'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { dbHelpers } from '../config/supabase.js'
import OfflineQueueService from '../services/offlineQueue.js'

const router = express.Router()
const offlineQueueService = new OfflineQueueService()

// Get offline queue statistics (Admin only)
router.get('/stats', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const stats = await offlineQueueService.getQueueStats()
    res.json({ success: true, stats })
  } catch (error) {
    console.error('Error getting offline queue stats:', error)
    res.status(500).json({ success: false, message: 'Failed to get queue statistics' })
  }
})

// Get offline queue items (Admin only)
router.get('/items', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    
    let query = dbHelpers.from('offline_reports')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    // Add pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    
    const { data, error } = await query
    
    if (error) throw error
    
    // Get total count
    const { count, error: countError } = await dbHelpers.from('offline_reports')
      .select('*', { count: 'exact', head: true })
    
    if (countError) throw countError
    
    res.json({
      success: true,
      items: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    console.error('Error getting offline queue items:', error)
    res.status(500).json({ success: false, message: 'Failed to get queue items' })
  }
})

// Get offline queue items for current user
router.get('/my-items', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await dbHelpers.from('offline_reports')
      .select('*')
      .eq('user_id', req.user.id)
      .is('synced_at', null)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    res.json({ success: true, items: data })
  } catch (error) {
    console.error('Error getting user offline queue items:', error)
    res.status(500).json({ success: false, message: 'Failed to get queue items' })
  }
})

// Add item to offline queue
router.post('/add', authenticateToken, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('incident_type').isIn(['harassment', 'assault', 'extortion', 'unlawful_arrest', 'other']).withMessage('Invalid incident type'),
  body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
  body('latitude').isFloat().withMessage('Valid latitude is required'),
  body('longitude').isFloat().withMessage('Valid longitude is required'),
  body('incident_date').isISO8601().withMessage('Valid incident date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const reportData = {
      user_id: req.user.id,
      report_data: req.body,
      created_at: new Date().toISOString()
    }

    const { data, error } = await dbHelpers.from('offline_reports')
      .insert([reportData])
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, item: data })
  } catch (error) {
    console.error('Error adding to offline queue:', error)
    res.status(500).json({ success: false, message: 'Failed to add to offline queue' })
  }
})

// Process offline queue (Admin only)
router.post('/process', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { itemId } = req.body
    
    if (itemId) {
      // Process specific item
      const result = await offlineQueueService.processSpecificItem(itemId)
      res.json({ success: true, result })
    } else {
      // Process all pending items
      const result = await offlineQueueService.processQueue()
      res.json({ success: true, result })
    }
  } catch (error) {
    console.error('Error processing offline queue:', error)
    res.status(500).json({ success: false, message: 'Failed to process queue' })
  }
})

// Retry failed items (Admin only)
router.post('/retry-failed', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const retryCount = await offlineQueueService.retryFailedItems()
    res.json({ success: true, retryCount })
  } catch (error) {
    console.error('Error retrying failed items:', error)
    res.status(500).json({ success: false, message: 'Failed to retry failed items' })
  }
})

// Clear failed items (Admin only)
router.delete('/clear-failed', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const removedCount = await offlineQueueService.clearFailedItems()
    res.json({ success: true, removedCount })
  } catch (error) {
    console.error('Error clearing failed items:', error)
    res.status(500).json({ success: false, message: 'Failed to clear failed items' })
  }
})

// Get offline queue health status
router.get('/health', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const stats = await offlineQueueService.getQueueStats()
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats,
      issues: []
    }

    // Check for potential issues
    if (stats.failed > 10) {
      health.status = 'warning'
      health.issues.push('High number of failed items')
    }

    if (stats.pending > 100) {
      health.status = 'warning'
      health.issues.push('Large queue backlog')
    }

    if (stats.retryCount > 50) {
      health.status = 'warning'
      health.issues.push('High retry count indicates persistent failures')
    }

    res.json({ success: true, health })
  } catch (error) {
    console.error('Error getting offline queue health:', error)
    res.status(500).json({ success: false, message: 'Failed to get queue health' })
  }
})

// Export offline queue data (Admin only)
router.get('/export', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { data, error } = await dbHelpers.from('offline_reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="offline-queue-${new Date().toISOString().split('T')[0]}.json"`)

    res.json({ success: true, data })
  } catch (error) {
    console.error('Error exporting offline queue:', error)
    res.status(500).json({ success: false, message: 'Failed to export queue data' })
  }
})

// Import offline queue data (Admin only)
router.post('/import', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { items } = req.body

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid import data format' })
    }

    // Validate items structure
    const validItems = items.filter(item => 
      item.user_id && item.report_data && item.created_at
    )

    if (validItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid items to import' })
    }

    const { data, error } = await dbHelpers.from('offline_reports')
      .insert(validItems)
      .select()

    if (error) throw error

    res.json({ 
      success: true, 
      imported: data.length,
      total: validItems.length
    })
  } catch (error) {
    console.error('Error importing offline queue:', error)
    res.status(500).json({ success: false, message: 'Failed to import queue data' })
  }
})

// Delete specific offline queue item (Admin only)
router.delete('/items/:id', authenticateToken, requireRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await dbHelpers.from('offline_reports')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({ success: true, message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting offline queue item:', error)
    res.status(500).json({ success: false, message: 'Failed to delete item' })
  }
})

// Update offline queue item status (Admin only)
router.patch('/items/:id/status', authenticateToken, requireRole(['admin', 'superadmin']), [
  body('status').isIn(['pending', 'processing', 'completed', 'failed']).withMessage('Invalid status'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const { id } = req.params
    const { status, notes } = req.body

    const updateData = { status, updated_at: new Date().toISOString() }
    if (notes) updateData.notes = notes

    const { data, error } = await dbHelpers.from('offline_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, item: data })
  } catch (error) {
    console.error('Error updating offline queue item status:', error)
    res.status(500).json({ success: false, message: 'Failed to update item status' })
  }
})

export default router
