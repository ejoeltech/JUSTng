// Data Synchronization Service for Offline/Online Sync
import { createClient } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'

class SyncService {
  constructor() {
    this.supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    )
    
    this.isOnline = navigator.onLine
    this.syncQueue = []
    this.syncInProgress = false
    this.lastSyncTime = null
    this.syncInterval = null
    this.conflictResolution = 'server-wins' // 'server-wins', 'client-wins', 'manual'
    this.maxRetries = 3
    this.retryDelay = 5000 // 5 seconds
    
    // Initialize
    this.init()
  }

  // Initialize sync service
  async init() {
    try {
      // Load sync queue from localStorage
      this.loadSyncQueue()
      
      // Set up online/offline listeners
      this.setupNetworkListeners()
      
      // Start auto-sync if online
      if (this.isOnline) {
        this.startAutoSync()
      }
      
      console.log('Sync service initialized')
    } catch (error) {
      console.error('Failed to initialize sync service:', error)
    }
  }

  // Set up network status listeners
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.onNetworkOnline()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
      this.onNetworkOffline()
    })
  }

  // Handle network coming online
  onNetworkOnline() {
    console.log('Network is online, starting sync...')
    this.startAutoSync()
    this.processSyncQueue()
  }

  // Handle network going offline
  onNetworkOffline() {
    console.log('Network is offline, stopping sync...')
    this.stopAutoSync()
  }

  // Start automatic synchronization
  startAutoSync() {
    if (this.syncInterval) return
    
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.processSyncQueue()
      }
    }, 30000)
    
    console.log('Auto-sync started')
  }

  // Stop automatic synchronization
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('Auto-sync stopped')
    }
  }

  // Add item to sync queue
  addToSyncQueue(operation, data, retryCount = 0) {
    const syncItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      data,
      timestamp: new Date().toISOString(),
      retryCount,
      status: 'pending'
    }
    
    this.syncQueue.push(syncItem)
    this.saveSyncQueue()
    
    // If online, try to sync immediately
    if (this.isOnline && !this.syncInProgress) {
      this.processSyncQueue()
    }
    
    return syncItem.id
  }

  // Process sync queue
  async processSyncQueue() {
    if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
      return
    }
    
    this.syncInProgress = true
    
    try {
      const pendingItems = this.syncQueue.filter(item => item.status === 'pending')
      
      if (pendingItems.length === 0) {
        return
      }
      
      console.log(`Processing ${pendingItems.length} sync items...`)
      
      for (const item of pendingItems) {
        try {
          await this.processSyncItem(item)
          item.status = 'completed'
          item.completedAt = new Date().toISOString()
        } catch (error) {
          console.error(`Failed to process sync item ${item.id}:`, error)
          
          if (item.retryCount < this.maxRetries) {
            item.retryCount++
            item.status = 'retrying'
            item.lastError = error.message
            item.nextRetry = new Date(Date.now() + this.retryDelay).toISOString()
          } else {
            item.status = 'failed'
            item.lastError = error.message
            item.failedAt = new Date().toISOString()
          }
        }
        
        // Save queue after each item
        this.saveSyncQueue()
      }
      
      this.lastSyncTime = new Date().toISOString()
      this.cleanupCompletedItems()
      
      console.log('Sync queue processing completed')
      
    } catch (error) {
      console.error('Error processing sync queue:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  // Process individual sync item
  async processSyncItem(item) {
    switch (item.operation.type) {
      case 'CREATE_INCIDENT':
        return await this.syncCreateIncident(item.data)
      
      case 'UPDATE_INCIDENT':
        return await this.syncUpdateIncident(item.data)
      
      case 'DELETE_INCIDENT':
        return await this.syncDeleteIncident(item.data)
      
      case 'UPLOAD_FILE':
        return await this.syncUploadFile(item.data)
      
      case 'UPDATE_USER':
        return await this.syncUpdateUser(item.data)
      
      default:
        throw new Error(`Unknown sync operation: ${item.operation.type}`)
    }
  }

  // Sync incident creation
  async syncCreateIncident(incidentData) {
    const { data, error } = await this.supabase
      .from('incidents')
      .insert(incidentData)
      .select()
      .single()
    
    if (error) throw error
    
    // Update local storage with server-generated ID
    this.updateLocalIncident(incidentData.localId, data)
    
    return data
  }

  // Sync incident update
  async syncUpdateIncident(updateData) {
    const { id, ...updates } = updateData
    
    const { data, error } = await this.supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return data
  }

  // Sync incident deletion
  async syncDeleteIncident(deleteData) {
    const { error } = await this.supabase
      .from('incidents')
      .delete()
      .eq('id', deleteData.id)
    
    if (error) throw error
    
    // Remove from local storage
    this.removeLocalIncident(deleteData.id)
    
    return { success: true }
  }

  // Sync file upload
  async syncUploadFile(fileData) {
    // This would integrate with your file upload service
    // For now, just return success
    return { success: true, fileId: fileData.fileId }
  }

  // Sync user update
  async syncUpdateUser(userData) {
    const { id, ...updates } = userData
    
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return data
  }

  // Update local incident data
  updateLocalIncident(localId, serverData) {
    try {
      const localIncidents = JSON.parse(localStorage.getItem('localIncidents') || '{}')
      localIncidents[localId] = {
        ...localIncidents[localId],
        ...serverData,
        synced: true,
        syncedAt: new Date().toISOString()
      }
      localStorage.setItem('localIncidents', JSON.stringify(localIncidents))
    } catch (error) {
      console.error('Failed to update local incident:', error)
    }
  }

  // Remove local incident
  removeLocalIncident(incidentId) {
    try {
      const localIncidents = JSON.parse(localStorage.getItem('localIncidents') || '{}')
      delete localIncidents[incidentId]
      localStorage.setItem('localIncidents', JSON.stringify(localIncidents))
    } catch (error) {
      console.error('Failed to remove local incident:', error)
    }
  }

  // Check for data conflicts
  async checkConflicts(localData, serverData) {
    const conflicts = []
    
    // Check for timestamp conflicts
    if (localData.updated_at && serverData.updated_at) {
      const localTime = new Date(localData.updated_at).getTime()
      const serverTime = new Date(serverData.updated_at).getTime()
      
      if (Math.abs(localTime - serverTime) > 5000) { // 5 second threshold
        conflicts.push({
          field: 'updated_at',
          local: localData.updated_at,
          server: serverData.updated_at,
          type: 'timestamp'
        })
      }
    }
    
    // Check for field conflicts
    const fieldsToCheck = ['title', 'description', 'status', 'severity']
    
    for (const field of fieldsToCheck) {
      if (localData[field] !== serverData[field]) {
        conflicts.push({
          field,
          local: localData[field],
          server: serverData[field],
          type: 'field'
        })
      }
    }
    
    return conflicts
  }

  // Resolve conflicts automatically
  async resolveConflicts(conflicts, localData, serverData) {
    switch (this.conflictResolution) {
      case 'server-wins':
        return serverData
      
      case 'client-wins':
        return localData
      
      case 'manual':
        // For manual resolution, we'll need user input
        // This could be implemented with a conflict resolution UI
        return await this.manualConflictResolution(conflicts, localData, serverData)
      
      default:
        return serverData
    }
  }

  // Manual conflict resolution (placeholder)
  async manualConflictResolution(conflicts, localData, serverData) {
    // This would show a UI for users to choose which version to keep
    // For now, return server data
    return serverData
  }

  // Force sync now
  async forceSync() {
    if (this.syncInProgress) {
      toast.error('Sync already in progress')
      return
    }
    
    toast.loading('Starting manual sync...')
    
    try {
      await this.processSyncQueue()
      toast.success('Manual sync completed')
    } catch (error) {
      toast.error('Manual sync failed')
      console.error('Manual sync error:', error)
    }
  }

  // Get sync status
  getSyncStatus() {
    const pending = this.syncQueue.filter(item => item.status === 'pending').length
    const retrying = this.syncQueue.filter(item => item.status === 'retrying').length
    const failed = this.syncQueue.filter(item => item.status === 'failed').length
    const completed = this.syncQueue.filter(item => item.status === 'completed').length
    
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      queueSize: this.syncQueue.length,
      pending,
      retrying,
      failed,
      completed,
      total: this.syncQueue.length
    }
  }

  // Get sync queue
  getSyncQueue() {
    return [...this.syncQueue]
  }

  // Clear completed items
  cleanupCompletedItems() {
    const completedItems = this.syncQueue.filter(item => item.status === 'completed')
    if (completedItems.length > 0) {
      this.syncQueue = this.syncQueue.filter(item => item.status !== 'completed')
      this.saveSyncQueue()
      console.log(`Cleaned up ${completedItems.length} completed sync items`)
    }
  }

  // Retry failed items
  async retryFailedItems() {
    const failedItems = this.syncQueue.filter(item => item.status === 'failed')
    
    for (const item of failedItems) {
      item.status = 'pending'
      item.retryCount = 0
      item.lastError = null
      item.failedAt = null
    }
    
    this.saveSyncQueue()
    
    if (this.isOnline) {
      await this.processSyncQueue()
    }
    
    return failedItems.length
  }

  // Clear all sync data
  clearSyncData() {
    this.syncQueue = []
    this.saveSyncQueue()
    this.lastSyncTime = null
    console.log('All sync data cleared')
  }

  // Save sync queue to localStorage
  saveSyncQueue() {
    try {
      localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue))
    } catch (error) {
      console.error('Failed to save sync queue:', error)
    }
  }

  // Load sync queue from localStorage
  loadSyncQueue() {
    try {
      const savedQueue = localStorage.getItem('syncQueue')
      if (savedQueue) {
        this.syncQueue = JSON.parse(savedQueue)
        
        // Reset status for items that were in progress
        this.syncQueue.forEach(item => {
          if (item.status === 'pending' || item.status === 'retrying') {
            item.status = 'pending'
          }
        })
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error)
      this.syncQueue = []
    }
  }

  // Export sync data
  exportSyncData() {
    try {
      const exportData = {
        syncQueue: this.syncQueue,
        lastSyncTime: this.lastSyncTime,
        exportTimestamp: new Date().toISOString()
      }
      
      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('Failed to export sync data:', error)
      throw error
    }
  }

  // Import sync data
  importSyncData(importData) {
    try {
      const data = JSON.parse(importData)
      
      if (data.syncQueue && Array.isArray(data.syncQueue)) {
        this.syncQueue = data.syncQueue
        this.saveSyncQueue()
      }
      
      if (data.lastSyncTime) {
        this.lastSyncTime = data.lastSyncTime
      }
      
      console.log('Sync data imported successfully')
    } catch (error) {
      console.error('Failed to import sync data:', error)
      throw error
    }
  }

  // Set conflict resolution strategy
  setConflictResolution(strategy) {
    if (['server-wins', 'client-wins', 'manual'].includes(strategy)) {
      this.conflictResolution = strategy
      console.log(`Conflict resolution strategy set to: ${strategy}`)
    } else {
      throw new Error('Invalid conflict resolution strategy')
    }
  }

  // Get conflict resolution strategy
  getConflictResolution() {
    return this.conflictResolution
  }

  // Destroy service
  destroy() {
    this.stopAutoSync()
    this.clearSyncData()
    console.log('Sync service destroyed')
  }
}

// Create singleton instance
const syncService = new SyncService()

export default syncService
