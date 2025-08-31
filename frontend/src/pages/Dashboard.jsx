import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  FileText, 
  MapPin, 
  TrendingUp,
  Filter,
  Search,
  Calendar,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Bell,
  Settings,
  User,
  Shield,
  Activity,
  Download,
  Share2,
  Star,
  MessageCircle,
  ChevronRight,
  Timer,
  Progress,
  Zap,
  Archive
} from 'lucide-react'
import apiService from '../services/api'
import { toast } from 'react-hot-toast'

const Dashboard = () => {
  const { user, userRole, canAccessAdmin } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [notifications, setNotifications] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    category: '',
    search: '',
    dateRange: '30'
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalIncidents: 0
  })
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [showNotifications, setShowNotifications] = useState(false)

  // Fetch user's incidents and statistics
  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user, filters, pagination.currentPage])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // Fetch incidents with filters
      const incidentsResult = await apiService.incidents.getAll({
        ...filters,
        page: pagination.currentPage,
        limit: 10
      })

      if (incidentsResult.incidents) {
        setIncidents(incidentsResult.incidents)
        setPagination(incidentsResult.pagination || pagination)
        
        // Generate recent activity from incidents
        const activity = incidentsResult.incidents.slice(0, 5).map(incident => ({
          id: incident.id,
          type: 'incident_update',
          title: `Incident "${incident.title}" status updated`,
          description: `Status changed to ${incident.status}`,
          timestamp: incident.updated_at || incident.created_at,
          status: incident.status,
          severity: incident.severity
        }))
        setRecentActivity(activity)
      }

      // Fetch user statistics
      const statsResult = await apiService.users.getStats()
      if (statsResult.data) {
        setStats(statsResult.data)
      }

      // Generate mock notifications for demo
      const mockNotifications = [
        {
          id: 1,
          type: 'status_update',
          title: 'Incident Status Updated',
          message: 'Your recent incident report is now under investigation',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          read: false,
          severity: 'info'
        },
        {
          id: 2,
          type: 'response',
          title: 'Official Response Received',
          message: 'Authorities have responded to your harassment report',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          read: false,
          severity: 'success'
        },
        {
          id: 3,
          type: 'reminder',
          title: 'Follow-up Required',
          message: 'Please provide additional details for case #12345',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          read: true,
          severity: 'warning'
        }
      ]
      setNotifications(mockNotifications)

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      
      // Handle API errors gracefully
      if (error.message.includes('backend not available')) {
        // Use local fallback data
        const localStats = {
          totalIncidents: 0,
          activeIncidents: 0,
          resolvedIncidents: 0,
          recentActivity: 0
        }
        setStats(localStats)
        toast.error('Backend not available - showing local data only')
      } else {
        toast.error('Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }))
  }

  const getStatusColor = (status) => {
    const colors = {
      reported: 'bg-blue-100 text-blue-800',
      investigating: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-orange-100 text-orange-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return colors[severity] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeAgo = (dateString) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  const getProgressPercentage = (status) => {
    const statusProgress = {
      reported: 25,
      investigating: 50,
      under_review: 75,
      resolved: 100,
      closed: 100
    }
    return statusProgress[status] || 0
  }

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    )
  }

  const exportIncidents = () => {
    try {
      const csvContent = incidents.map(incident => [
        incident.id,
        incident.title,
        incident.status,
        incident.severity,
        incident.category,
        formatDate(incident.created_at),
        incident.location?.address || 'N/A'
      ]).join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `incidents-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Incidents exported successfully')
    } catch (error) {
      toast.error('Failed to export incidents')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Please log in to access your dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Notifications */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user.fullName || user.email?.split('@')[0]}!
              </h1>
              <p className="text-gray-600 mt-1">Track your incidents and stay updated</p>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
                >
                  <Bell className="h-6 w-6" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.filter(n => !n.read).length}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-400 mt-2">{getTimeAgo(notification.timestamp)}</p>
                              </div>
                              {!notification.read && (
                                <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <Link
                to="/report"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Report Incident
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'incidents', name: 'My Incidents', icon: FileText },
              { id: 'activity', name: 'Recent Activity', icon: Activity },
              { id: 'profile', name: 'Profile', icon: User }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
            <span className="ml-2 text-gray-600">Loading your dashboard...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Enhanced Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Reports</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalIncidents || 0}</p>
                        <p className="text-xs text-green-600 mt-1">+{stats.recentActivity || 0} this week</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">In Progress</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.activeIncidents || 0}</p>
                        <p className="text-xs text-yellow-600 mt-1">Being reviewed</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Resolved</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.resolvedIncidents || 0}</p>
                        <p className="text-xs text-green-600 mt-1">Successfully closed</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Response Rate</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.totalIncidents > 0 ? Math.round((stats.resolvedIncidents / stats.totalIncidents) * 100) : 0}%
                        </p>
                        <p className="text-xs text-purple-600 mt-1">Average response</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Latest Incidents */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Latest Incidents</h3>
                      <Link
                        to="#"
                        onClick={() => setActiveTab('incidents')}
                        className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                      >
                        View all
                      </Link>
                    </div>
                    <div className="space-y-4">
                      {incidents.slice(0, 3).map(incident => (
                        <div key={incident.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0">
                            <div className={`h-3 w-3 rounded-full ${getProgressPercentage(incident.status) === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{incident.title}</p>
                            <p className="text-xs text-gray-500">{getTimeAgo(incident.created_at)}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                              {incident.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {incidents.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p>No incidents reported yet</p>
                          <Link
                            to="/report"
                            className="text-primary-600 hover:text-primary-800 text-sm font-medium mt-2 inline-block"
                          >
                            Report your first incident
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <Link
                        to="/report"
                        className="flex items-center p-3 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                      >
                        <Plus className="h-5 w-5 text-primary-600 mr-3" />
                        <span className="text-primary-700 font-medium">Report New Incident</span>
                      </Link>
                      
                      <Link
                        to="/map"
                        className="flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <MapPin className="h-5 w-5 text-blue-600 mr-3" />
                        <span className="text-blue-700 font-medium">View Incident Map</span>
                      </Link>
                      
                      <button
                        onClick={exportIncidents}
                        className="flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors w-full text-left"
                      >
                        <Download className="h-5 w-5 text-green-600 mr-3" />
                        <span className="text-green-700 font-medium">Export My Data</span>
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('profile')}
                        className="flex items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors w-full text-left"
                      >
                        <Settings className="h-5 w-5 text-purple-600 mr-3" />
                        <span className="text-purple-700 font-medium">Account Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'incidents' && (
              <div className="space-y-6">
                {/* Filters and Search */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          placeholder="Search incidents..."
                          value={filters.search}
                          onChange={(e) => handleFilterChange('search', e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      
                      <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">All Status</option>
                        <option value="reported">Reported</option>
                        <option value="investigating">Investigating</option>
                        <option value="under_review">Under Review</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      
                      <select
                        value={filters.severity}
                        onChange={(e) => handleFilterChange('severity', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">All Severity</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    
                    <button
                      onClick={fetchUserData}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Incidents List */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">My Incident Reports</h3>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {incidents.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No incidents found</h3>
                        <p className="text-gray-500 mb-4">You haven't reported any incidents yet or they don't match your filters.</p>
                        <Link
                          to="/report"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Report Your First Incident
                        </Link>
                      </div>
                    ) : (
                      incidents.map(incident => (
                        <div key={incident.id} className="p-6 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <h4 className="text-lg font-medium text-gray-900">{incident.title}</h4>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                                  {incident.status}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                                  {incident.severity}
                                </span>
                              </div>
                              
                              <p className="text-gray-600 mt-1 line-clamp-2">{incident.description}</p>
                              
                              <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {formatDate(incident.created_at)}
                                </div>
                                {incident.location?.address && (
                                  <div className="flex items-center">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {incident.location.address}
                                  </div>
                                )}
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="mt-4">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-medium text-gray-700">Case Progress</span>
                                  <span className="text-xs text-gray-500">{getProgressPercentage(incident.status)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${getProgressPercentage(incident.status)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => setSelectedIncident(incident)}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" title="Edit">
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalIncidents)} of {pagination.totalIncidents} incidents
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={pagination.currentPage === 1}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={pagination.currentPage === pagination.totalPages}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {recentActivity.length === 0 ? (
                      <div className="text-center py-12">
                        <Activity className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                        <p className="text-gray-500">Activity will appear here as your incidents are updated.</p>
                      </div>
                    ) : (
                      recentActivity.map(activity => (
                        <div key={activity.id} className="p-6">
                          <div className="flex items-start space-x-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              activity.type === 'incident_update' ? 'bg-blue-100' : 'bg-green-100'
                            }`}>
                              {activity.type === 'incident_update' ? (
                                <Clock className="h-4 w-4 text-blue-600" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                              <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                              <div className="flex items-center mt-2 space-x-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                                  {activity.status}
                                </span>
                                <span className="text-xs text-gray-500">{getTimeAgo(activity.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Profile Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={user.fullName || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={user.email || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={user.phone || 'Not provided'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <input
                        type="text"
                        value={userRole || 'user'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* Account Statistics */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalIncidents || 0}</div>
                      <div className="text-sm text-blue-800">Total Reports</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.resolvedIncidents || 0}</div>
                      <div className="text-sm text-green-800">Resolved Cases</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{stats.activeIncidents || 0}</div>
                      <div className="text-sm text-yellow-800">Active Cases</div>
                    </div>
                  </div>
                </div>

                {/* Privacy & Settings */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy & Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Email Notifications</div>
                        <div className="text-sm text-gray-600">Receive updates about your incidents via email</div>
                      </div>
                      <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Anonymous Reporting</div>
                        <div className="text-sm text-gray-600">Hide your identity in incident reports</div>
                      </div>
                      <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Data Export</div>
                        <div className="text-sm text-gray-600">Download your incident data</div>
                      </div>
                      <button
                        onClick={exportIncidents}
                        className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50"
                      >
                        Export Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Dashboard