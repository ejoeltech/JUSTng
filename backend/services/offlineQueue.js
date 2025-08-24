import { dbHelpers } from '../config/supabase.js'
import { v4 as uuidv4 } from 'uuid'

class OfflineQueueService {
  constructor() {
    this.queueKey = 'just_offline_reports'
    this.syncInProgress = false
    this.maxRetries = 3
    this.retryDelay = 5000 // 5 seconds
  }

  /**
   * Check if the device is online
   */
  isOnline() {
    return navigator.onLine !== false && navigator.onLine !== undefined
  }

  /**
   * Add a report to the offline queue
   */
  async addToQueue(reportData) {
    try {
      const queueItem = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        data: reportData,
        retryCount: 0,
        status: 'pending'
      }

      // Get existing queue
      const existingQueue = this.getQueue()
      existingQueue.push(queueItem)
      
      // Save to localStorage
      this.saveQueue(existingQueue)

      console.log(`📝 Report queued offline: ${queueItem.id}`)
      return queueItem.id

    } catch (error) {
      console.error('Error adding to offline queue:', error)
      throw new Error('Failed to queue report offline')
    }
  }

  /**
   * Get all items in the offline queue
   */
  getQueue() {
    try {
      if (typeof window !== 'undefined') {
        // Frontend environment
        const stored = localStorage.getItem(this.queueKey)
        return stored ? JSON.parse(stored) : []
      } else {
        // Backend environment - get from database
        return this.getOfflineReportsFromDB()
      }
    } catch (error) {
      console.error('Error getting offline queue:', error)
      return []
    }
  }

  /**
   * Save queue to localStorage (frontend) or database (backend)
   */
  saveQueue(queue) {
    try {
      if (typeof window !== 'undefined') {
        // Frontend environment
        localStorage.setItem(this.queueKey, JSON.stringify(queue))
      } else {
        // Backend environment - save to database
        this.saveOfflineReportsToDB(queue)
      }
    } catch (error) {
      console.error('Error saving offline queue:', error)
    }
  }

  /**
   * Remove an item from the queue
   */
  removeFromQueue(itemId) {
    try {
      const queue = this.getQueue()
      const filteredQueue = queue.filter(item => item.id !== itemId)
      this.saveQueue(filteredQueue)
      
      console.log(`🗑️ Removed from offline queue: ${itemId}`)
      return true
    } catch (error) {
      console.error('Error removing from offline queue:', error)
      return false
    }
  }

  /**
   * Update queue item status
   */
  updateQueueItemStatus(itemId, status, error = null) {
    try {
      const queue = this.getQueue()
      const item = queue.find(q => q.id === itemId)
      
      if (item) {
        item.status = status
        item.lastAttempt = new Date().toISOString()
        
        if (error) {
          item.lastError = error.message || error
          item.retryCount = (item.retryCount || 0) + 1
        }
        
        this.saveQueue(queue)
      }
    } catch (error) {
      console.error('Error updating queue item status:', error)
    }
  }

  /**
   * Process the offline queue when back online
   */
  async processQueue(apiService) {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress, skipping...')
      return
    }

    if (!this.isOnline()) {
      console.log('📡 Still offline, skipping queue processing')
      return
    }

    this.syncInProgress = true
    const queue = this.getQueue()
    const pendingItems = queue.filter(item => item.status === 'pending')

    if (pendingItems.length === 0) {
      console.log('✅ No pending items in offline queue')
      this.syncInProgress = false
      return
    }

    console.log(`🔄 Processing ${pendingItems.length} offline reports...`)

    for (const item of pendingItems) {
      try {
        // Check retry limit
        if (item.retryCount >= this.maxRetries) {
          console.log(`❌ Max retries reached for item: ${item.id}`)
          this.updateQueueItemStatus(item.id, 'failed', new Error('Max retries exceeded'))
          continue
        }

        // Update status to processing
        this.updateQueueItemStatus(item.id, 'processing')

        // Process the report
        const result = await this.processReport(item, apiService)
        
        if (result.success) {
          // Mark as successful and remove from queue
          this.updateQueueItemStatus(item.id, 'completed')
          this.removeFromQueue(item.id)
          console.log(`✅ Successfully processed offline report: ${item.id}`)
        } else {
          // Mark as failed for retry
          this.updateQueueItemStatus(item.id, 'failed', result.error)
          console.log(`❌ Failed to process offline report: ${item.id}`, result.error)
        }

        // Add delay between processing to avoid overwhelming the server
        await this.delay(1000)

      } catch (error) {
        console.error(`❌ Error processing offline report ${item.id}:`, error)
        this.updateQueueItemStatus(item.id, 'failed', error)
      }
    }

    this.syncInProgress = false
    console.log('🏁 Offline queue processing completed')
  }

  /**
   * Process a single offline report
   */
  async processReport(queueItem, apiService) {
    try {
      const { data } = queueItem
      
      // Create the incident
      const incident = await apiService.incidents.create({
        title: data.title,
        description: data.description,
        incident_type: data.incident_type,
        severity: data.severity,
        incident_date: data.incident_date,
        address: data.address,
        is_anonymous: data.is_anonymous,
        latitude: data.latitude,
        longitude: data.longitude
      })

      // Upload media files if any
      if (data.mediaFiles && data.mediaFiles.length > 0) {
        for (const mediaFile of data.mediaFiles) {
          try {
            await apiService.incidents.uploadMedia(mediaFile, (progress) => {
              console.log(`📤 Upload progress for ${mediaFile.name}: ${progress}%`)
            })
          } catch (uploadError) {
            console.error(`Failed to upload media file: ${mediaFile.name}`, uploadError)
            // Continue with other files
          }
        }
      }

      // Save to database as synced
      if (typeof window === 'undefined') {
        await this.markAsSynced(queueItem.id)
      }

      return { success: true, incident }

    } catch (error) {
      console.error('Error processing offline report:', error)
      return { success: false, error }
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    try {
      const queue = this.getQueue()
      const stats = {
        total: queue.length,
        pending: queue.filter(item => item.status === 'pending').length,
        processing: queue.filter(item => item.status === 'processing').length,
        completed: queue.filter(item => item.status === 'completed').length,
        failed: queue.filter(item => item.status === 'failed').length,
        retryCount: queue.reduce((sum, item) => sum + (item.retryCount || 0), 0)
      }

      return stats
    } catch (error) {
      console.error('Error getting queue stats:', error)
      return { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, retryCount: 0 }
    }
  }

  /**
   * Clear failed items from queue
   */
  clearFailedItems() {
    try {
      const queue = this.getQueue()
      const filteredQueue = queue.filter(item => item.status !== 'failed')
      this.saveQueue(filteredQueue)
      
      const removedCount = queue.length - filteredQueue.length
      console.log(`🗑️ Cleared ${removedCount} failed items from offline queue`)
      
      return removedCount
    } catch (error) {
      console.error('Error clearing failed items:', error)
      return 0
    }
  }

  /**
   * Retry failed items
   */
  retryFailedItems() {
    try {
      const queue = this.getQueue()
      const updatedQueue = queue.map(item => {
        if (item.status === 'failed') {
          return { ...item, status: 'pending', retryCount: 0 }
        }
        return item
      })
      
      this.saveQueue(updatedQueue)
      
      const retryCount = queue.filter(item => item.status === 'failed').length
      console.log(`🔄 Reset ${retryCount} failed items for retry`)
      
      return retryCount
    } catch (error) {
      console.error('Error retrying failed items:', error)
      return 0
    }
  }

  /**
   * Database operations for backend environment
   */
  async getOfflineReportsFromDB() {
    try {
      const { data, error } = await dbHelpers.from('offline_reports')
        .select('*')
        .is('synced_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error

      return data.map(report => ({
        id: report.id,
        timestamp: report.created_at,
        data: report.report_data,
        retryCount: 0,
        status: 'pending'
      }))

    } catch (error) {
      console.error('Error getting offline reports from DB:', error)
      return []
    }
  }

  async saveOfflineReportsToDB(queue) {
    try {
      // This would typically be called when adding new items
      // For now, we'll just log that we're in backend mode
      console.log('Backend mode: Queue items would be saved to database')
    } catch (error) {
      console.error('Error saving offline reports to DB:', error)
    }
  }

  async markAsSynced(itemId) {
    try {
      const { error } = await dbHelpers.from('offline_reports')
        .update({ synced_at: new Date().toISOString() })
        .eq('id', itemId)

      if (error) throw error
      console.log(`✅ Marked offline report as synced: ${itemId}`)

    } catch (error) {
      console.error('Error marking offline report as synced:', error)
    }
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Initialize offline queue monitoring
   */
  initializeMonitoring(apiService) {
    if (typeof window !== 'undefined') {
      // Frontend environment
      window.addEventListener('online', () => {
        console.log('🌐 Back online, processing offline queue...')
        this.processQueue(apiService)
      })

      window.addEventListener('offline', () => {
        console.log('📡 Gone offline, reports will be queued')
      })

      // Process queue on page load if online
      if (this.isOnline()) {
        setTimeout(() => this.processQueue(apiService), 2000)
      }
    }
  }
}

export default OfflineQueueService
