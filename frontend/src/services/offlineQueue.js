import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'

class OfflineQueueService {
  constructor() {
    this.queueKey = 'just_offline_reports'
    this.syncInProgress = false
    this.maxRetries = 3
    this.retryDelay = 5000 // 5 seconds
    this.listeners = new Set()
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

      // Notify listeners
      this.notifyListeners('itemAdded', queueItem)

      console.log(`📝 Report queued offline: ${queueItem.id}`)
      toast.success('Report saved offline. Will sync when connection is restored.')
      
      return queueItem.id

    } catch (error) {
      console.error('Error adding to offline queue:', error)
      toast.error('Failed to save report offline')
      throw new Error('Failed to queue report offline')
    }
  }

  /**
   * Get all items in the offline queue
   */
  getQueue() {
    try {
      const stored = localStorage.getItem(this.queueKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error getting offline queue:', error)
      return []
    }
  }

  /**
   * Save queue to localStorage
   */
  saveQueue(queue) {
    try {
      localStorage.setItem(this.queueKey, JSON.stringify(queue))
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
      
      // Notify listeners
      this.notifyListeners('itemRemoved', itemId)
      
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
        
        // Notify listeners
        this.notifyListeners('itemUpdated', item)
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
    toast.loading(`Syncing ${pendingItems.length} offline reports...`)

    let successCount = 0
    let failureCount = 0

    for (const item of pendingItems) {
      try {
        // Check retry limit
        if (item.retryCount >= this.maxRetries) {
          console.log(`❌ Max retries reached for item: ${item.id}`)
          this.updateQueueItemStatus(item.id, 'failed', new Error('Max retries exceeded'))
          failureCount++
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
          successCount++
          console.log(`✅ Successfully processed offline report: ${item.id}`)
        } else {
          // Mark as failed for retry
          this.updateQueueItemStatus(item.id, 'failed', result.error)
          failureCount++
          console.log(`❌ Failed to process offline report: ${item.id}`, result.error)
        }

        // Add delay between processing to avoid overwhelming the server
        await this.delay(1000)

      } catch (error) {
        console.error(`❌ Error processing offline report ${item.id}:`, error)
        this.updateQueueItemStatus(item.id, 'failed', error)
        failureCount++
      }
    }

    this.syncInProgress = false
    
    // Show results
    if (successCount > 0 && failureCount === 0) {
      toast.success(`Successfully synced ${successCount} offline reports!`)
    } else if (successCount > 0 && failureCount > 0) {
      toast.success(`Synced ${successCount} reports, ${failureCount} failed`)
    } else if (failureCount > 0) {
      toast.error(`Failed to sync ${failureCount} offline reports`)
    }

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
      
      if (removedCount > 0) {
        toast.success(`Cleared ${removedCount} failed items`)
      }
      
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
      
      if (retryCount > 0) {
        toast.success(`Reset ${retryCount} failed items for retry`)
      }
      
      return retryCount
    } catch (error) {
      console.error('Error retrying failed items:', error)
      return 0
    }
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Add event listener for queue changes
   */
  addListener(event, callback) {
    this.listeners.add({ event, callback })
  }

  /**
   * Remove event listener
   */
  removeListener(event, callback) {
    this.listeners.forEach(listener => {
      if (listener.event === event && listener.callback === callback) {
        this.listeners.delete(listener)
      }
    })
  }

  /**
   * Notify all listeners of an event
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        try {
          listener.callback(data)
        } catch (error) {
          console.error('Error in listener callback:', error)
        }
      }
    })
  }

  /**
   * Initialize offline queue monitoring
   */
  initializeMonitoring(apiService) {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Back online, processing offline queue...')
      toast.success('Connection restored! Syncing offline reports...')
      this.processQueue(apiService)
    })

    window.addEventListener('offline', () => {
      console.log('📡 Gone offline, reports will be queued')
      toast.info('Connection lost. Reports will be saved offline.')
    })

    // Process queue on page load if online
    if (this.isOnline()) {
      setTimeout(() => this.processQueue(apiService), 2000)
    }

    // Set up periodic sync check
    setInterval(() => {
      if (this.isOnline() && !this.syncInProgress) {
        const stats = this.getQueueStats()
        if (stats.pending > 0) {
          console.log(`🔄 Periodic sync check: ${stats.pending} pending items`)
          this.processQueue(apiService)
        }
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Export queue data (for debugging/backup)
   */
  exportQueue() {
    try {
      const queue = this.getQueue()
      const dataStr = JSON.stringify(queue, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `offline-queue-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Offline queue exported successfully')
    } catch (error) {
      console.error('Error exporting queue:', error)
      toast.error('Failed to export offline queue')
    }
  }

  /**
   * Import queue data (for debugging/restore)
   */
  importQueue(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const importedQueue = JSON.parse(e.target.result)
          
          if (Array.isArray(importedQueue)) {
            // Validate queue structure
            const isValid = importedQueue.every(item => 
              item.id && item.timestamp && item.data && item.status
            )
            
            if (isValid) {
              const existingQueue = this.getQueue()
              const mergedQueue = [...existingQueue, ...importedQueue]
              this.saveQueue(mergedQueue)
              
              toast.success(`Imported ${importedQueue.length} items to offline queue`)
              resolve(importedQueue.length)
            } else {
              reject(new Error('Invalid queue data format'))
            }
          } else {
            reject(new Error('Invalid file format'))
          }
        } catch (error) {
          reject(new Error('Failed to parse queue data'))
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }
}

// Create and export singleton instance
const offlineQueueService = new OfflineQueueService()
export default offlineQueueService
