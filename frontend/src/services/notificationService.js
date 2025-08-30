// Notification Service for Real-time Alerts and Notifications
import { toast } from 'react-hot-toast'
import { createClient } from '@supabase/supabase-js'

class NotificationService {
  constructor() {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    
    // Only initialize Supabase if we have the required environment variables
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey)
    } else {
      console.warn('Supabase environment variables not found. Notifications will work in local mode.')
      this.supabase = null
    }
    
    this.notifications = []
    this.subscriptions = new Map()
    this.isEnabled = false
    this.soundEnabled = true
    this.desktopEnabled = false
    this.notificationQueue = []
    this.maxNotifications = 100
    
    // Initialize
    this.init()
  }

  // Initialize notification service
  async init() {
    try {
      // Check if browser supports notifications
      if ('Notification' in window) {
        this.desktopEnabled = Notification.permission === 'granted'
        
        if (Notification.permission === 'default') {
          // Request permission
          const permission = await Notification.requestPermission()
          this.desktopEnabled = permission === 'granted'
        }
      }

      // Load user preferences
      await this.loadPreferences()
      
      // Enable real-time notifications
      await this.enableRealTime()
      
      console.log('Notification service initialized')
    } catch (error) {
      console.error('Failed to initialize notification service:', error)
    }
  }

  // Load user preferences
  async loadPreferences() {
    try {
      const preferences = localStorage.getItem('notificationPreferences')
      if (preferences) {
        const prefs = JSON.parse(preferences)
        this.soundEnabled = prefs.soundEnabled !== undefined ? prefs.soundEnabled : true
        this.desktopEnabled = prefs.desktopEnabled !== undefined ? prefs.desktopEnabled : this.desktopEnabled
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }

  // Save user preferences
  async savePreferences() {
    try {
      const preferences = {
        soundEnabled: this.soundEnabled,
        desktopEnabled: this.desktopEnabled
      }
      localStorage.setItem('notificationPreferences', JSON.stringify(preferences))
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
    }
  }

  // Enable real-time notifications
  async enableRealTime() {
    if (this.isEnabled || !this.supabase) return

    try {
      // Subscribe to incident notifications
      const incidentSubscription = this.supabase
        .channel('incident-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'incidents'
          },
          (payload) => {
            this.handleNewIncident(payload.new)
          }
        )
        .subscribe()

      // Subscribe to status change notifications
      const statusSubscription = this.supabase
        .channel('status-notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'incidents'
          },
          (payload) => {
            if (payload.old.status !== payload.new.status) {
              this.handleStatusChange(payload.old, payload.new)
            }
          }
        )
        .subscribe()

      this.subscriptions.set('incidents', incidentSubscription)
      this.subscriptions.set('status', statusSubscription)
      this.isEnabled = true

      console.log('Real-time notifications enabled')
    } catch (error) {
      console.error('Failed to enable real-time notifications:', error)
    }
  }

  // Disable real-time notifications
  disableRealTime() {
    this.subscriptions.forEach((subscription, key) => {
      subscription.unsubscribe()
    })
    this.subscriptions.clear()
    this.isEnabled = false
    console.log('Real-time notifications disabled')
  }

  // Handle new incident notification
  handleNewIncident(incident) {
    const notification = {
      id: `incident-${incident.id}`,
      type: 'incident',
      title: 'New Incident Reported',
      message: `${incident.title} reported in ${incident.state || 'Unknown location'}`,
      severity: incident.severity,
      timestamp: new Date(),
      data: incident,
      read: false
    }

    this.addNotification(notification)
    this.showToast(notification)
    this.showDesktopNotification(notification)
    this.playNotificationSound()
  }

  // Handle status change notification
  handleStatusChange(oldIncident, newIncident) {
    const notification = {
      id: `status-${newIncident.id}`,
      type: 'status',
      title: 'Incident Status Updated',
      message: `${newIncident.title} status changed from ${oldIncident.status} to ${newIncident.status}`,
      severity: newIncident.severity,
      timestamp: new Date(),
      data: { old: oldIncident, new: newIncident },
      read: false
    }

    this.addNotification(notification)
    this.showToast(notification)
    this.showDesktopNotification(notification)
    this.playNotificationSound()
  }

  // Add notification to queue
  addNotification(notification) {
    this.notifications.unshift(notification)
    
    // Limit notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications)
    }

    // Emit notification event
    this.emitNotificationEvent('new', notification)
  }

  // Show toast notification
  showToast(notification) {
    const toastOptions = {
      duration: 5000,
      position: 'top-right',
      style: {
        background: this.getSeverityColor(notification.severity),
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 16px'
      }
    }

    toast(notification.message, toastOptions)
  }

  // Show desktop notification
  showDesktopNotification(notification) {
    if (!this.desktopEnabled || !('Notification' in window)) return

    try {
      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.severity === 'critical',
        data: notification
      })

      // Handle notification click
      desktopNotification.onclick = () => {
        window.focus()
        this.markAsRead(notification.id)
        this.emitNotificationEvent('click', notification)
      }

      // Auto-close after 10 seconds (unless critical)
      if (notification.severity !== 'critical') {
        setTimeout(() => {
          desktopNotification.close()
        }, 10000)
      }
    } catch (error) {
      console.error('Failed to show desktop notification:', error)
    }
  }

  // Play notification sound
  playNotificationSound() {
    if (!this.soundEnabled) return

    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (error) {
      console.error('Failed to play notification sound:', error)
    }
  }

  // Get severity color
  getSeverityColor(severity) {
    const colors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#F97316',
      critical: '#EF4444'
    }
    return colors[severity] || '#6B7280'
  }

  // Mark notification as read
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      this.emitNotificationEvent('read', notification)
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true
    })
    this.emitNotificationEvent('readAll')
  }

  // Remove notification
  removeNotification(notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId)
    if (index !== -1) {
      const notification = this.notifications[index]
      this.notifications.splice(index, 1)
      this.emitNotificationEvent('removed', notification)
    }
  }

  // Clear all notifications
  clearAllNotifications() {
    this.notifications = []
    this.emitNotificationEvent('cleared')
  }

  // Get unread notifications count
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length
  }

  // Get notifications by type
  getNotificationsByType(type) {
    return this.notifications.filter(n => n.type === type)
  }

  // Get notifications by severity
  getNotificationsBySeverity(severity) {
    return this.notifications.filter(n => n.severity === severity)
  }

  // Get recent notifications
  getRecentNotifications(limit = 10) {
    return this.notifications
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  // Send custom notification
  sendNotification(type, title, message, severity = 'medium', data = null) {
    const notification = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      severity,
      timestamp: new Date(),
      data,
      read: false
    }

    this.addNotification(notification)
    this.showToast(notification)
    this.showDesktopNotification(notification)
    
    if (severity === 'critical') {
      this.playNotificationSound()
    }

    return notification
  }

  // Send system notification
  sendSystemNotification(title, message, severity = 'info') {
    return this.sendNotification('system', title, message, severity)
  }

  // Send success notification
  sendSuccess(title, message) {
    return this.sendNotification('success', title, message, 'low')
  }

  // Send warning notification
  sendWarning(title, message) {
    return this.sendNotification('warning', title, message, 'medium')
  }

  // Send error notification
  sendError(title, message) {
    return this.sendNotification('error', title, message, 'high')
  }

  // Send critical notification
  sendCritical(title, message) {
    return this.sendNotification('critical', title, message, 'critical')
  }

  // Toggle sound
  toggleSound() {
    this.soundEnabled = !this.soundEnabled
    this.savePreferences()
    this.emitNotificationEvent('soundToggled', { enabled: this.soundEnabled })
  }

  // Toggle desktop notifications
  async toggleDesktopNotifications() {
    if (!('Notification' in window)) {
      this.sendError('Not Supported', 'Desktop notifications are not supported in this browser')
      return
    }

    if (this.desktopEnabled) {
      this.desktopEnabled = false
    } else {
      const permission = await Notification.requestPermission()
      this.desktopEnabled = permission === 'granted'
      
      if (!this.desktopEnabled) {
        this.sendWarning('Permission Denied', 'Desktop notifications are disabled')
      }
    }

    this.savePreferences()
    this.emitNotificationEvent('desktopToggled', { enabled: this.desktopEnabled })
  }

  // Emit notification event
  emitNotificationEvent(type, data = null) {
    const event = new CustomEvent('notificationEvent', {
      detail: { type, data, timestamp: Date.now() }
    })
    window.dispatchEvent(event)
  }

  // Get notification statistics
  getNotificationStats() {
    const total = this.notifications.length
    const unread = this.getUnreadCount()
    const byType = this.notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {})
    const bySeverity = this.notifications.reduce((acc, n) => {
      acc[n.severity] = (acc[n.severity] || 0) + 1
      return acc
    }, {})

    return {
      total,
      unread,
      byType,
      bySeverity,
      soundEnabled: this.soundEnabled,
      desktopEnabled: this.desktopEnabled,
      realTimeEnabled: this.isEnabled
    }
  }

  // Export notifications
  exportNotifications(format = 'json') {
    try {
      if (format === 'csv') {
        return this.convertToCSV(this.notifications)
      }
      return JSON.stringify(this.notifications, null, 2)
    } catch (error) {
      console.error('Failed to export notifications:', error)
      throw error
    }
  }

  // Convert notifications to CSV
  convertToCSV(notifications) {
    if (!notifications.length) return ''

    const headers = ['ID', 'Type', 'Title', 'Message', 'Severity', 'Timestamp', 'Read']
    const rows = notifications.map(n => [
      n.id,
      n.type,
      `"${n.title}"`,
      `"${n.message}"`,
      n.severity,
      n.timestamp.toISOString(),
      n.read ? 'Yes' : 'No'
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  // Cleanup old notifications
  cleanupOldNotifications(daysOld = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const oldNotifications = this.notifications.filter(n => n.timestamp < cutoffDate)
    this.notifications = this.notifications.filter(n => n.timestamp >= cutoffDate)

    if (oldNotifications.length > 0) {
      console.log(`Cleaned up ${oldNotifications.length} old notifications`)
      this.emitNotificationEvent('cleaned', { count: oldNotifications.length })
    }
  }

  // Destroy service
  destroy() {
    this.disableRealTime()
    this.clearAllNotifications()
    this.subscriptions.clear()
    console.log('Notification service destroyed')
  }
}

// Create singleton instance
const notificationService = new NotificationService()

export default notificationService
