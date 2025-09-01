import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import { 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  Shield,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MapPin,
  Calendar,
  Download,
  RefreshCw,
  Plus,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Activity,
  UserPlus,
  Mail,
  Phone,
  Globe,
  Ban,
  CheckSquare,
  Square,
  ArrowUpDown,
  Archive,
  Star,
  MessageSquare,
  ExternalLink,
  User,
  Bell
} from 'lucide-react'
import apiService from '../services/api'
import { toast } from 'react-hot-toast'

const AdminDashboard = () => {
  const { user, userRole, canAccessAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [incidents, setIncidents] = useState([])
  const [users, setUsers] = useState([])
  const [analytics, setAnalytics] = useState({})
  const [selectedItems, setSelectedItems] = useState([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    severity: '',
    role: '',
    dateRange: '30'
  })
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  })

  // New state for system configuration
  const [systemConfig, setSystemConfig] = useState({
    appSettings: {
      maintenanceMode: false,
      allowNewRegistrations: true,
      requireEmailVerification: true,
      maxLoginAttempts: 5,
      maxFileSize: 10, // MB
      sessionTimeout: 24 // hours
    },
    notificationSettings: {
      emailNotifications: true,
      pushNotifications: true,
      incidentAlerts: true
    },
    securitySettings: {
      twoFactorAuth: false,
      rateLimiting: true,
      auditLogging: true
    },
    performanceSettings: {
      cacheEnabled: true,
      cacheTimeout: 3600, // seconds
      monitoringEnabled: true
    }
  })
  const [configSaving, setConfigSaving] = useState(false)
  const [activeConfigSection, setActiveConfigSection] = useState('app')

  useEffect(() => {
    if (canAccessAdmin()) {
      fetchDashboardData()
    }
  }, [activeTab, filters, pagination.currentPage])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      if (activeTab === 'overview' || activeTab === 'incidents') {
        await fetchIncidents()
      }
      
      if (activeTab === 'overview' || activeTab === 'users') {
        await fetchUsers()
      }
      
      if (activeTab === 'overview') {
        await fetchAnalytics()
      }
      
    } catch (error) {
      console.error('Error fetching admin data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchIncidents = async () => {
    try {
      const result = await apiService.incidents.getAll({
        ...filters,
        page: pagination.currentPage,
        limit: 20
      })
      
      if (result.incidents) {
        setIncidents(result.incidents)
        setPagination(prev => ({ ...prev, ...result.pagination }))
      }
    } catch (error) {
      console.error('Error fetching incidents:', error)
      // Fallback to mock data for demo
      const mockIncidents = generateMockIncidents()
      setIncidents(mockIncidents)
    }
  }

  const fetchUsers = async () => {
    try {
      const result = await apiService.admin.getUsers({
        role: filters.role,
        search: filters.search
      })
      
      if (result.users) {
        setUsers(result.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      // Fallback to mock data for demo
      const mockUsers = generateMockUsers()
      setUsers(mockUsers)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const result = await apiService.admin.getAnalytics()
      if (result.data) {
        setAnalytics(result.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      // Fallback to mock data for demo
      setAnalytics(generateMockAnalytics())
    }
  }

  // Mock data generators for demo purposes
  const generateMockIncidents = () => {
    return [
      {
        id: 'INC-001',
        title: 'Police checkpoint harassment in Lagos',
        description: 'Excessive force used during routine checkpoint...',
        status: 'investigating',
        severity: 'high',
        category: 'checkpoint_harassment',
        reporter: { name: 'John Doe', email: 'john@example.com' },
        location: { address: 'Victoria Island, Lagos', lat: 6.4281, lng: 3.4219 },
        created_at: '2025-01-01T10:30:00Z',
        updated_at: '2025-01-01T14:20:00Z',
        assigned_to: 'Officer Sarah',
        priority: 'high',
        evidence_count: 3
      },
      {
        id: 'INC-002',
        title: 'Unlawful detention in Abuja',
        description: 'Detained without warrant for 3 hours...',
        status: 'under_review',
        severity: 'critical',
        category: 'unlawful_detention',
        reporter: { name: 'Jane Smith', email: 'jane@example.com' },
        location: { address: 'Wuse District, Abuja', lat: 9.0579, lng: 7.4951 },
        created_at: '2024-12-31T15:45:00Z',
        updated_at: '2025-01-01T09:10:00Z',
        assigned_to: 'Inspector Mike',
        priority: 'urgent',
        evidence_count: 2
      },
      {
        id: 'INC-003',
        title: 'Extortion at roadblock',
        description: 'Demanded illegal payment for passage...',
        status: 'resolved',
        severity: 'medium',
        category: 'extortion',
        reporter: { name: 'Ahmed Hassan', email: 'ahmed@example.com' },
        location: { address: 'Kaduna-Abuja Road', lat: 10.5105, lng: 7.4165 },
        created_at: '2024-12-30T08:20:00Z',
        updated_at: '2024-12-31T16:30:00Z',
        assigned_to: 'Sergeant Paul',
        priority: 'medium',
        evidence_count: 1
      }
    ]
  }

  const generateMockUsers = () => {
    return [
      {
        id: 'USR-001',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '+234-803-123-4567',
        role: 'user',
        status: 'active',
        created_at: '2024-12-15T10:30:00Z',
        last_login: '2025-01-01T08:15:00Z',
        incident_count: 2,
        location: 'Lagos, Nigeria'
      },
      {
        id: 'USR-002',
        full_name: 'Sarah Johnson',
        email: 'sarah@police.gov.ng',
        phone: '+234-807-987-6543',
        role: 'police',
        status: 'active',
        created_at: '2024-11-20T14:20:00Z',
        last_login: '2025-01-01T07:45:00Z',
        incident_count: 15,
        location: 'Abuja, Nigeria'
      },
      {
        id: 'USR-003',
        full_name: 'Mike Admin',
        email: 'mike@just.gov.ng',
        phone: '+234-802-555-1234',
        role: 'admin',
        status: 'active',
        created_at: '2024-10-10T09:00:00Z',
        last_login: '2024-12-31T23:30:00Z',
        incident_count: 50,
        location: 'Lagos, Nigeria'
      }
    ]
  }

  const generateMockAnalytics = () => {
    return {
      totalIncidents: 156,
      totalUsers: 89,
      activeIncidents: 23,
      resolvedIncidents: 133,
      newIncidentsToday: 5,
      newUsersThisWeek: 12,
      avgResponseTime: '2.3 days',
      resolutionRate: 85.3,
      byStatus: {
        reported: 12,
        investigating: 15,
        under_review: 8,
        resolved: 133,
        closed: 21
      },
      bySeverity: {
        low: 45,
        medium: 67,
        high: 32,
        critical: 12
      },
      byCategory: {
        checkpoint_harassment: 45,
        unlawful_detention: 23,
        extortion: 67,
        brutality: 21
      }
    }
  }

  const handleStatusUpdate = async (incidentId, newStatus) => {
    try {
      // API call would go here
      setIncidents(prev => 
        prev.map(incident => 
          incident.id === incidentId 
            ? { ...incident, status: newStatus, updated_at: new Date().toISOString() }
            : incident
        )
      )
      toast.success(`Incident status updated to ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update incident status')
    }
  }

  const handleUserStatusUpdate = async (userId, newStatus) => {
    try {
      await apiService.admin.updateUserStatus(userId, newStatus)
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, status: newStatus }
            : user
        )
      )
      toast.success(`User status updated to ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update user status')
    }
  }

  const handleUserRoleUpdate = async (userId, newRole) => {
    try {
      await apiService.admin.updateUser(userId, { role: newRole })
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, role: newRole }
            : user
        )
      )
      toast.success(`User role updated to ${newRole}`)
    } catch (error) {
      toast.error('Failed to update user role')
    }
  }

  const handleDeleteUser = async (userId) => {
    try {
      await apiService.admin.deleteUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('User deleted')
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  const handleBulkAction = async (action) => {
    try {
      // API call would go here for bulk operations
      toast.success(`Bulk ${action} completed for ${selectedItems.length} items`)
      setSelectedItems([])
      setShowBulkActions(false)
    } catch (error) {
      toast.error(`Failed to complete bulk ${action}`)
    }
  }

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const getStatusColor = (status) => {
    const colors = {
      reported: 'bg-blue-100 text-blue-800',
      investigating: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-orange-100 text-orange-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
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
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  const exportConfig = () => {
    const configData = JSON.stringify(systemConfig, null, 2)
    const blob = new Blob([configData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'system_config.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('System configuration exported successfully!')
  }

  const importConfig = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const configData = await file.text()
      const parsedConfig = JSON.parse(configData)
      setSystemConfig(parsedConfig)
      toast.success('System configuration imported successfully!')
    } catch (error) {
      console.error('Error importing config:', error)
      toast.error('Failed to import system configuration. Invalid JSON file.')
    }
  }

  const saveSystemConfig = async (section, config) => {
    setConfigSaving(true)
    try {
      await apiService.admin.saveSystemConfig(section, config)
      toast.success(`System ${section} saved successfully!`)
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error(`Failed to save system ${section}.`)
    } finally {
      setConfigSaving(false)
    }
  }

  const resetConfigSection = (section) => {
    setSystemConfig(prev => ({
      ...prev,
      [section]: { // Assuming a default structure for each section
        maintenanceMode: false,
        allowNewRegistrations: true,
        requireEmailVerification: true,
        maxLoginAttempts: 5,
        maxFileSize: 10,
        sessionTimeout: 24,
        emailNotifications: true,
        pushNotifications: true,
        incidentAlerts: true,
        twoFactorAuth: false,
        rateLimiting: true,
        auditLogging: true,
        cacheEnabled: true,
        cacheTimeout: 3600,
        monitoringEnabled: true
      }
    }))
    toast.success(`System ${section} reset to defaults.`)
  }

  if (!canAccessAdmin()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Admin privileges required to access this page.</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage users, incidents, and system analytics</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'users', name: 'Users', icon: Users },
              { id: 'incidents', name: 'Incidents', icon: FileText },
              { id: 'settings', name: 'Settings', icon: Settings }
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
            <span className="ml-2 text-gray-600">Loading admin dashboard...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Analytics Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Incidents</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.totalIncidents || 0}</p>
                        <p className="text-xs text-green-600 mt-1">+{analytics.newIncidentsToday || 0} today</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.resolutionRate || 0}%</p>
                        <p className="text-xs text-green-600 mt-1">↑ 5.2% from last month</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.avgResponseTime || 'N/A'}</p>
                        <p className="text-xs text-green-600 mt-1">↓ 0.5 days improved</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Active Users</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.totalUsers || 0}</p>
                        <p className="text-xs text-green-600 mt-1">+{analytics.newUsersThisWeek || 0} this week</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'incidents' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          placeholder="Search incidents..."
                          value={filters.search}
                          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
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
                        onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">All Severity</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Incidents Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Incident Management</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems(incidents.map(i => i.id))
                                } else {
                                  setSelectedItems([])
                                }
                              }}
                              className="h-4 w-4 text-primary-600 rounded"
                            />
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Incident
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reporter
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Severity
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Assigned To
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {incidents.map((incident) => (
                          <tr key={incident.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(incident.id)}
                                onChange={() => toggleItemSelection(incident.id)}
                                className="h-4 w-4 text-primary-600 rounded"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-start space-x-3">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{incident.title}</div>
                                  <div className="text-sm text-gray-500 line-clamp-2">{incident.description}</div>
                                  <div className="flex items-center mt-1 text-xs text-gray-400">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {incident.location?.address}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{incident.reporter?.name}</div>
                              <div className="text-sm text-gray-500">{incident.reporter?.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={incident.status}
                                onChange={(e) => handleStatusUpdate(incident.id, e.target.value)}
                                className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 ${getStatusColor(incident.status)}`}
                              >
                                <option value="reported">Reported</option>
                                <option value="investigating">Investigating</option>
                                <option value="under_review">Under Review</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                                {incident.severity}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {incident.assigned_to || (
                                <button className="text-primary-600 hover:text-primary-800 font-medium">
                                  Assign
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(incident.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  className="text-primary-600 hover:text-primary-800"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  className="text-gray-600 hover:text-gray-800"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                {/* User Filters */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={filters.search}
                          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      
                      <select
                        value={filters.role}
                        onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">All Roles</option>
                        <option value="user">User</option>
                        <option value="police">Police</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </div>
                    
                    <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </button>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">User Management</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems(users.map(u => u.id))
                                } else {
                                  setSelectedItems([])
                                }
                              }}
                              className="h-4 w-4 text-primary-600 rounded"
                            />
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Incidents
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Login
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((usr) => (
                          <tr key={usr.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(usr.id)}
                                onChange={() => toggleItemSelection(usr.id)}
                                className="h-4 w-4 text-primary-600 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{usr.full_name}</div>
                                  <div className="text-sm text-gray-500">{usr.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={usr.role}
                                onChange={(e) => handleUserRoleUpdate(usr.id, e.target.value)}
                                className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 ${
                                  usr.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                  usr.role === 'police' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                <option value="user">User</option>
                                <option value="police">Police</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Super Admin</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={usr.status}
                                onChange={(e) => handleUserStatusUpdate(usr.id, e.target.value)}
                                className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 ${getStatusColor(usr.status)}`}
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="pending">Pending</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {usr.incident_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {usr.last_login ? getTimeAgo(usr.last_login) : 'Never'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  className="text-primary-600 hover:text-primary-800"
                                  title="View Profile"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(usr.id)}
                                  className="text-red-600 hover:text-red-800"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
        </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Settings Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">System Configuration</h3>
                      <p className="text-sm text-gray-600 mt-1">Manage application settings, security, and performance</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={exportConfig}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </button>
                      <label className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                        <input
                          type="file"
                          accept=".json"
                          onChange={importConfig}
                          className="hidden"
                        />
                        Import
                      </label>
                    </div>
                  </div>
                </div>

                {/* Configuration Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Sidebar Navigation */}
                  <div className="lg:col-span-1">
                    <nav className="space-y-1">
                      {[
                        { id: 'app', name: 'App Settings', icon: Settings, description: 'General application configuration' },
                        { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Notification preferences' },
                        { id: 'security', name: 'Security', icon: Shield, description: 'Security and authentication' },
                        { id: 'performance', name: 'Performance', icon: Activity, description: 'Performance and caching' }
                      ].map((section) => {
                        const Icon = section.icon
                        return (
                          <button
                            key={section.id}
                            onClick={() => setActiveConfigSection(section.id)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                              activeConfigSection === section.id
                                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center">
                              <Icon className="h-4 w-4 mr-3" />
                              <div>
                                <div className="font-medium">{section.name}</div>
                                <div className="text-xs text-gray-500">{section.description}</div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </nav>
                  </div>

                  {/* Configuration Content */}
                  <div className="lg:col-span-3">
                    {activeConfigSection === 'app' && (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-medium text-gray-900">App Settings</h4>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => resetConfigSection('appSettings')}
                              className="text-sm text-gray-600 hover:text-gray-800"
                            >
                              Reset to Defaults
                            </button>
                            <button
                              onClick={() => saveSystemConfig('appSettings', systemConfig.appSettings)}
                              disabled={configSaving}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                            >
                              {configSaving ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                'Save Changes'
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {/* System Status */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-3">System Status</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={systemConfig.appSettings.maintenanceMode}
                                  onChange={(e) => setSystemConfig(prev => ({
                                    ...prev,
                                    appSettings: {
                                      ...prev.appSettings,
                                      maintenanceMode: e.target.checked
                                    }
                                  }))}
                                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">Maintenance Mode</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={systemConfig.appSettings.allowNewRegistrations}
                                  onChange={(e) => setSystemConfig(prev => ({
                                    ...prev,
                                    appSettings: {
                                      ...prev.appSettings,
                                      allowNewRegistrations: e.target.checked
                                    }
                                  }))}
                                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">Allow New Registrations</span>
                              </label>
                            </div>
                          </div>

                          {/* Security Settings */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-3">Security Settings</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={systemConfig.appSettings.requireEmailVerification}
                                  onChange={(e) => setSystemConfig(prev => ({
                                    ...prev,
                                    appSettings: {
                                      ...prev.appSettings,
                                      requireEmailVerification: e.target.checked
                                    }
                                  }))}
                                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">Require Email Verification</span>
                              </label>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Max Login Attempts
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={systemConfig.appSettings.maxLoginAttempts}
                                  onChange={(e) => setSystemConfig(prev => ({
                                    ...prev,
                                    appSettings: {
                                      ...prev.appSettings,
                                      maxLoginAttempts: parseInt(e.target.value)
                                    }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* File Upload Settings */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-3">File Upload Settings</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Max File Size (MB)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={systemConfig.appSettings.maxFileSize}
                                  onChange={(e) => setSystemConfig(prev => ({
                                    ...prev,
                                    appSettings: {
                                      ...prev.appSettings,
                                      maxFileSize: parseInt(e.target.value)
                                    }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Session Timeout (hours)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="168"
                                  value={systemConfig.appSettings.sessionTimeout}
                                  onChange={(e) => setSystemConfig(prev => ({
                                    ...prev,
                                    appSettings: {
                                      ...prev.appSettings,
                                      sessionTimeout: parseInt(e.target.value)
                                    }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeConfigSection === 'notifications' && (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-medium text-gray-900">Notification Settings</h4>
                          <button
                            onClick={() => saveSystemConfig('notificationSettings', systemConfig.notificationSettings)}
                            disabled={configSaving}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                          >
                            {configSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                        <div className="space-y-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={systemConfig.notificationSettings.emailNotifications}
                              onChange={(e) => setSystemConfig(prev => ({
                                ...prev,
                                notificationSettings: {
                                  ...prev.notificationSettings,
                                  emailNotifications: e.target.checked
                                }
                              }))}
                              className="h-4 w-4 text-primary-600 rounded border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Enable Email Notifications</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={systemConfig.notificationSettings.pushNotifications}
                              onChange={(e) => setSystemConfig(prev => ({
                                ...prev,
                                notificationSettings: {
                                  ...prev.notificationSettings,
                                  pushNotifications: e.target.checked
                                }
                              }))}
                              className="h-4 w-4 text-primary-600 rounded border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Enable Push Notifications</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={systemConfig.notificationSettings.incidentAlerts}
                              onChange={(e) => setSystemConfig(prev => ({
                                ...prev,
                                notificationSettings: {
                                  ...prev.notificationSettings,
                                  incidentAlerts: e.target.checked
                                }
                              }))}
                              className="h-4 w-4 text-primary-600 rounded border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Incident Alerts</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {activeConfigSection === 'security' && (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-medium text-gray-900">Security Settings</h4>
                          <button
                            onClick={() => saveSystemConfig('securitySettings', systemConfig.securitySettings)}
                            disabled={configSaving}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                          >
                            {configSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                        <div className="space-y-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={systemConfig.securitySettings.twoFactorAuth}
                              onChange={(e) => setSystemConfig(prev => ({
                                ...prev,
                                securitySettings: {
                                  ...prev.securitySettings,
                                  twoFactorAuth: e.target.checked
                                }
                              }))}
                              className="h-4 w-4 text-primary-600 rounded border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Enable Two-Factor Authentication</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={systemConfig.securitySettings.rateLimiting}
                              onChange={(e) => setSystemConfig(prev => ({
                                ...prev,
                                securitySettings: {
                                  ...prev.securitySettings,
                                  rateLimiting: e.target.checked
                                }
                              }))}
                              className="h-4 w-4 text-primary-600 rounded border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Enable Rate Limiting</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={systemConfig.securitySettings.auditLogging}
                              onChange={(e) => setSystemConfig(prev => ({
                                ...prev,
                                securitySettings: {
                                  ...prev.securitySettings,
                                  auditLogging: e.target.checked
                                }
                              }))}
                              className="h-4 w-4 text-primary-600 rounded border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Enable Audit Logging</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {activeConfigSection === 'performance' && (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-medium text-gray-900">Performance Settings</h4>
                          <button
                            onClick={() => saveSystemConfig('performanceSettings', systemConfig.performanceSettings)}
                            disabled={configSaving}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                          >
                            {configSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                        <div className="space-y-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={systemConfig.performanceSettings.cacheEnabled}
                              onChange={(e) => setSystemConfig(prev => ({
                                ...prev,
                                performanceSettings: {
                                  ...prev.performanceSettings,
                                  cacheEnabled: e.target.checked
                                }
                              }))}
                              className="h-4 w-4 text-primary-600 rounded border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Enable Caching</span>
                          </label>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Cache Timeout (seconds)
                            </label>
                            <input
                              type="number"
                              min="60"
                              max="86400"
                              value={systemConfig.performanceSettings.cacheTimeout}
                              onChange={(e) => setSystemConfig(prev => ({
                                ...prev,
                                performanceSettings: {
                                  ...prev.performanceSettings,
                                  cacheTimeout: parseInt(e.target.value)
                                }
                              }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={systemConfig.performanceSettings.monitoringEnabled}
                              onChange={(e) => setSystemConfig(prev => ({
                                ...prev,
                                performanceSettings: {
                                  ...prev.performanceSettings,
                                  monitoringEnabled: e.target.checked
                                }
                              }))}
                              className="h-4 w-4 text-primary-600 rounded border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Enable Performance Monitoring</span>
                          </label>
                        </div>
                      </div>
                    )}
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

export default AdminDashboard
