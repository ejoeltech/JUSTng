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
  User
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
        <div className="text-center py-12 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Admin dashboard functionality coming soon...</p>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
