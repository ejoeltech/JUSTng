// Real-Time Dashboard Component
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  TrendingUp, 
  Users, 
  FileText,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  Download,
  Filter,
  Search,
  BarChart3,
  PieChart,
  Calendar,
  Clock3
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import incidentService from '../services/incidentService'
import notificationService from '../services/notificationService'
import syncService from '../services/syncService'
import { nigerianStates } from '../data/nigerianStates'

const RealTimeDashboard = () => {
  // State management
  const [incidents, setIncidents] = useState([])
  const [statistics, setStatistics] = useState({})
  const [notifications, setNotifications] = useState([])
  const [syncStatus, setSyncStatus] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')
  const [selectedState, setSelectedState] = useState('all')
  const [selectedSeverity, setSelectedSeverity] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [viewMode, setViewMode] = useState('overview') // overview, detailed, analytics

  // Memoized computed values
  const filteredIncidents = useMemo(() => {
    let filtered = incidents

    // Filter by time range
    if (selectedTimeRange !== 'all') {
      const now = new Date()
      const timeRanges = {
        '1h': new Date(now.getTime() - 60 * 60 * 1000),
        '6h': new Date(now.getTime() - 6 * 60 * 60 * 1000),
        '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
        '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
      filtered = filtered.filter(incident => 
        new Date(incident.created_at) >= timeRanges[selectedTimeRange]
      )
    }

    // Filter by state
    if (selectedState !== 'all') {
      filtered = filtered.filter(incident => incident.state === selectedState)
    }

    // Filter by severity
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(incident => incident.severity === selectedSeverity)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(incident =>
        incident.title.toLowerCase().includes(query) ||
        incident.description.toLowerCase().includes(query) ||
        incident.address?.toLowerCase().includes(query) ||
        incident.state?.toLowerCase().includes(query) ||
        incident.lga?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [incidents, selectedTimeRange, selectedState, selectedSeverity, searchQuery])

  const incidentStats = useMemo(() => {
    const stats = {
      total: filteredIncidents.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byStatus: { reported: 0, investigating: 0, in_progress: 0, resolved: 0, closed: 0, dismissed: 0 },
      byState: {},
      byCategory: {},
      recent: 0,
      resolved: 0,
      avgResponseTime: 0
    }

    filteredIncidents.forEach(incident => {
      // Severity breakdown
      if (stats.bySeverity[incident.severity] !== undefined) {
        stats.bySeverity[incident.severity]++
      }

      // Status breakdown
      if (stats.byStatus[incident.status] !== undefined) {
        stats.byStatus[incident.status]++
      }

      // State breakdown
      if (incident.state) {
        stats.byState[incident.state] = (stats.byState[incident.state] || 0) + 1
      }

      // Category breakdown
      if (incident.category_id) {
        stats.byCategory[incident.category_id] = (stats.byCategory[incident.category_id] || 0) + 1
      }

      // Recent incidents (last 24 hours)
      const incidentDate = new Date(incident.created_at)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      if (incidentDate >= oneDayAgo) {
        stats.recent++
      }

      // Resolved incidents
      if (incident.status === 'resolved' || incident.status === 'closed') {
        stats.resolved++
      }
    })

    // Calculate resolution rate
    if (stats.total > 0) {
      stats.resolutionRate = ((stats.resolved / stats.total) * 100).toFixed(1)
    }

    return stats
  }, [filteredIncidents])

  // Initialize services and data
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true)
        
        // Enable real-time features
        await incidentService.enableRealTime()
        await notificationService.enableRealTime()
        
        // Load initial data
        await loadDashboardData()
        
        // Set up auto-refresh
        if (autoRefresh) {
          startAutoRefresh()
        }
        
        console.log('Dashboard initialized successfully')
      } catch (error) {
        console.error('Failed to initialize dashboard:', error)
        toast.error('Failed to initialize dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    initializeDashboard()

    return () => {
      stopAutoRefresh()
    }
  }, [])

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      // Load incidents
      const incidentsData = await incidentService.getIncidents({}, 1, 1000)
      setIncidents(incidentsData.data || [])

      // Load statistics
      const statsData = await incidentService.getIncidentStatistics()
      setStatistics(statsData)

      // Load notifications
      const recentNotifications = notificationService.getRecentNotifications(20)
      setNotifications(recentNotifications)

      // Get sync status
      const syncStatusData = syncService.getSyncStatus()
      setSyncStatus(syncStatusData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard data')
    }
  }, [])

  // Auto-refresh functionality
  const startAutoRefresh = useCallback(() => {
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, loadDashboardData])

  const stopAutoRefresh = useCallback(() => {
    // Clear any existing intervals
    const intervals = window.setInterval(() => {}, 999999)
    for (let i = 0; i < intervals; i++) {
      clearInterval(i)
    }
  }, [])

  // Handle real-time updates
  useEffect(() => {
    const handleIncidentUpdate = (event) => {
      const { type, data } = event.detail
      
      if (type === 'incidentCreated') {
        setIncidents(prev => [data, ...prev])
        toast.success(`New incident: ${data.title}`)
      } else if (type === 'incidentUpdated') {
        setIncidents(prev => 
          prev.map(incident => 
            incident.id === data.id ? { ...incident, ...data } : incident
          )
        )
      } else if (type === 'incidentDeleted') {
        setIncidents(prev => prev.filter(incident => incident.id !== data.id))
      }
    }

    const handleNotificationUpdate = (event) => {
      const { type, data } = event.detail
      
      if (type === 'new') {
        setNotifications(prev => [data, ...prev])
      }
    }

    const handleSyncUpdate = () => {
      const newSyncStatus = syncService.getSyncStatus()
      setSyncStatus(newSyncStatus)
    }

    // Listen for real-time events
    window.addEventListener('incidentEvent', handleIncidentUpdate)
    window.addEventListener('notificationEvent', handleNotificationUpdate)
    window.addEventListener('syncEvent', handleSyncUpdate)

    return () => {
      window.removeEventListener('incidentEvent', handleIncidentUpdate)
      window.removeEventListener('notificationEvent', handleNotificationUpdate)
      window.removeEventListener('syncEvent', handleSyncUpdate)
    }
  }, [])

  // Manual refresh
  const handleManualRefresh = useCallback(async () => {
    toast.loading('Refreshing dashboard...')
    try {
      await loadDashboardData()
      toast.success('Dashboard refreshed')
    } catch (error) {
      toast.error('Failed to refresh dashboard')
    }
  }, [loadDashboardData])

  // Export data
  const handleExportData = useCallback(async (format = 'json') => {
    try {
      const exportData = await incidentService.exportIncidents({}, format)
      
      if (format === 'csv') {
        const blob = new Blob([exportData], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `incidents-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const blob = new Blob([exportData], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `incidents-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        window.URL.revokeObjectURL(url)
      }
      
      toast.success(`Data exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export data')
    }
  }, [])

  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(!autoRefresh)
    if (!autoRefresh) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  }, [autoRefresh, startAutoRefresh, stopAutoRefresh])

  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId) => {
    notificationService.markAsRead(notificationId)
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }, [])

  // Render statistics cards
  const renderStatCard = (title, value, icon, color, subtitle = '') => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
      </div>
    </div>
  )

  // Render severity breakdown
  const renderSeverityBreakdown = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Severity Breakdown</h3>
      <div className="space-y-3">
        {Object.entries(incidentStats.bySeverity).map(([severity, count]) => (
          <div key={severity} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: 
                    severity === 'low' ? '#10B981' :
                    severity === 'medium' ? '#F59E0B' :
                    severity === 'high' ? '#F97316' : '#EF4444'
                }}
              />
              <span className="capitalize text-sm font-medium text-gray-700">
                {severity}
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // Render status breakdown
  const renderStatusBreakdown = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
      <div className="space-y-3">
        {Object.entries(incidentStats.byStatus).map(([status, count]) => (
          <div key={status} className="flex items-center justify-between">
            <span className="capitalize text-sm font-medium text-gray-700">
              {status.replace('_', ' ')}
            </span>
            <span className="text-sm font-semibold text-gray-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )

  // Render recent incidents
  const renderRecentIncidents = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Incidents</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {filteredIncidents.slice(0, 10).map(incident => (
          <div key={incident.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div 
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: 
                  incident.severity === 'low' ? '#10B981' :
                  incident.severity === 'medium' ? '#F59E0B' :
                  incident.severity === 'high' ? '#F97316' : '#EF4444'
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{incident.title}</p>
              <p className="text-xs text-gray-500">
                {incident.state}, {incident.lga} • {new Date(incident.created_at).toLocaleDateString()}
              </p>
            </div>
            <span className="text-xs font-medium text-gray-500 capitalize">
              {incident.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  // Render notifications panel
  const renderNotificationsPanel = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <button
          onClick={() => notificationService.markAllAsRead()}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Mark all read
        </button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {notifications.slice(0, 10).map(notification => (
          <div 
            key={notification.id} 
            className={`p-3 rounded-lg border ${
              notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div 
                className="w-2 h-2 rounded-full mt-2"
                style={{ backgroundColor: notificationService.getSeverityColor(notification.severity) }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
              {!notification.read && (
                <button
                  onClick={() => markNotificationAsRead(notification.id)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Render sync status
  const renderSyncStatus = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Status</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Connection</span>
          <div className="flex items-center space-x-2">
            {syncStatus.isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              syncStatus.isOnline ? 'text-green-600' : 'text-red-600'
            }`}>
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Sync Status</span>
          <span className={`text-sm font-medium ${
            syncStatus.syncInProgress ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {syncStatus.syncInProgress ? 'Syncing...' : 'Idle'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Queue Size</span>
          <span className="text-sm font-medium text-gray-900">{syncStatus.queueSize}</span>
        </div>
        
        {syncStatus.lastSyncTime && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Sync</span>
            <span className="text-sm text-gray-900">
              {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Real-Time Dashboard</h1>
              <div className="flex items-center space-x-2">
                {syncStatus.isOnline ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm text-gray-600">
                  {syncStatus.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleManualRefresh}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notificationService.getUnreadCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notificationService.getUnreadCount()}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>

              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All States</option>
                {nigerianStates.map(state => (
                  <option key={state.id} value={state.name}>{state.name}</option>
                ))}
              </select>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleAutoRefresh}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  autoRefresh 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </button>

              <button
                onClick={() => handleExportData('json')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {renderStatCard(
            'Total Incidents',
            incidentStats.total,
            <FileText className="w-6 h-6" style={{ color: '#6B7280' }} />,
            '#6B7280'
          )}
          {renderStatCard(
            'Recent (24h)',
            incidentStats.recent,
            <Clock className="w-6 h-6" style={{ color: '#F59E0B' }} />,
            '#F59E0B'
          )}
          {renderStatCard(
            'Resolved',
            incidentStats.resolved,
            <CheckCircle className="w-6 h-6" style={{ color: '#10B981' }} />,
            '#10B981',
            `${incidentStats.resolutionRate || 0}% rate`
          )}
          {renderStatCard(
            'Critical',
            incidentStats.bySeverity.critical,
            <AlertTriangle className="w-6 h-6" style={{ color: '#EF4444' }} />,
            '#EF4444',
            'Requires attention'
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts and Breakdowns */}
          <div className="lg:col-span-2 space-y-6">
            {renderSeverityBreakdown()}
            {renderStatusBreakdown()}
            {renderRecentIncidents()}
          </div>

          {/* Right Column - Notifications and Sync */}
          <div className="space-y-6">
            {renderNotificationsPanel()}
            {renderSyncStatus()}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auto-refresh Interval
                </label>
                <select
                  value={refreshInterval / 1000}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value) * 1000)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Time Range
                </label>
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1h">Last Hour</option>
                  <option value="6h">Last 6 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Sound Notifications</span>
                <button
                  onClick={() => notificationService.toggleSound()}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    notificationService.soundEnabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {notificationService.soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Desktop Notifications</span>
                <button
                  onClick={() => notificationService.toggleDesktopNotifications()}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    notificationService.desktopEnabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {notificationService.desktopEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RealTimeDashboard
