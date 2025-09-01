import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  Settings, Server, Database, Shield, Bell, Activity, TrendingUp,
  Users, AlertTriangle, Clock, CheckCircle, XCircle, Wrench,
  Globe, Lock, BarChart3, FileText, Archive, Edit
} from 'lucide-react'
import toast from 'react-hot-toast'

const SuperAdminDashboard = () => {
  const { user, userRole } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [systemHealth, setSystemHealth] = useState({})
  const [announcements, setAnnouncements] = useState([])
  const [appSettings, setAppSettings] = useState({})
  const [activeTab, setActiveTab] = useState('overview')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)

  // Mock data for now - replace with API calls
  useEffect(() => {
    if (userRole !== 'superadmin') {
      navigate('/dashboard')
      return
    }

    const fetchData = async () => {
      try {
        // Mock super admin stats
        const mockStats = {
          totalIncidents: 156,
          totalUsers: 89,
          newUsers: 12,
          growthRate: 15.5,
          storageUsage: {
            totalSize: 2.5, // GB
            buckets: {
              'incident-photos': { fileCount: 234, size: 1.2 },
              'incident-videos': { fileCount: 89, size: 1.3 }
            },
            totalBuckets: 2
          },
          avgResponseTime: 2.3, // days
          systemUptime: 99.8 // percentage
        }

        // Mock system health
        const mockSystemHealth = {
          database: { status: 'healthy', connection: 'active' },
          storage: { status: 'healthy', buckets: 2 },
          auth: { status: 'healthy', users_count: 89 },
          performance: { response_time: 245, status: 'good' }
        }

        // Mock announcements
        const mockAnnouncements = [
          {
            id: 1,
            title: 'System Maintenance Notice',
            content: 'Scheduled maintenance on Sunday 2AM-4AM',
            type: 'info',
            priority: 'medium',
            is_active: true,
            created_at: '2024-08-20T10:00:00Z'
          },
          {
            id: 2,
            title: 'New Feature: Live Video Reporting',
            content: 'Users can now report incidents with live video',
            type: 'success',
            priority: 'high',
            is_active: true,
            created_at: '2024-08-18T14:30:00Z'
          }
        ]

        // Mock app settings
        const mockAppSettings = {
          app_name: 'JUST - Justice Under Surveillance Tech',
          app_version: '1.0.0',
          maintenance_mode: false,
          maintenance_message: 'System is under maintenance. Please try again later.',
          feature_flags: {
            live_streaming: true,
            offline_mode: false,
            push_notifications: true
          }
        }

        setStats(mockStats)
        setSystemHealth(mockSystemHealth)
        setAnnouncements(mockAnnouncements)
        setAppSettings(mockAppSettings)
        setMaintenanceMode(mockAppSettings.maintenance_mode)
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching super admin data:', error)
        toast.error('Failed to load super admin data')
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userRole, navigate])

  // Toggle maintenance mode
  const toggleMaintenanceMode = async () => {
    try {
      // TODO: Implement API call to toggle maintenance mode
      setMaintenanceMode(!maintenanceMode)
      toast.success(`Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'}`)
    } catch (error) {
      toast.error('Failed to toggle maintenance mode')
    }
  }

  // Create new announcement
  const createAnnouncement = () => {
    // TODO: Implement announcement creation modal
    toast.info('Announcement creation feature coming soon')
  }

  // Update app settings
  const updateAppSettings = (key, value) => {
    setAppSettings(prev => ({
      ...prev,
      [key]: value
    }))
    // TODO: Implement API call to update settings
    toast.success('Setting updated')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading super admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Super Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                System administration and configuration management
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Super Admin</span>
              </div>
              <button
                onClick={toggleMaintenanceMode}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  maintenanceMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'system', name: 'System', icon: Server },
              { id: 'announcements', name: 'Announcements', icon: Bell },
              { id: 'settings', name: 'Settings', icon: Settings },
              { id: 'analytics', name: 'Analytics', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* System Health Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Server className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">System Uptime</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.systemUptime}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">User Growth</p>
                    <p className="text-2xl font-bold text-gray-900">+{stats.growthRate}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Response</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}d</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Database className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Storage Used</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.storageUsage.totalSize}GB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Health Status */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(systemHealth).map(([service, health]) => (
                    <div key={service} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {service}
                          </p>
                          <p className="text-xs text-gray-500">
                            {health.status === 'healthy' ? 'Operational' : 'Issue Detected'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {service === 'performance' && (
                          <p className="text-sm font-medium text-gray-900">
                            {health.response_time}ms
                          </p>
                        )}
                        {service === 'database' && (
                          <p className="text-sm text-gray-500">{health.connection}</p>
                        )}
                        {service === 'storage' && (
                          <p className="text-sm text-gray-500">{health.buckets} buckets</p>
                        )}
                        {service === 'auth' && (
                          <p className="text-sm text-gray-500">{health.users_count} users</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Storage Overview */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Storage Overview</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {Object.entries(stats.storageUsage.buckets).map(([bucket, info]) => (
                    <div key={bucket} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Archive className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {bucket.replace('-', ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {info.fileCount} files
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {info.size} GB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            {/* System Diagnostics */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">System Diagnostics</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Database Health</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Connection:</span>
                        <span className="text-sm font-medium text-green-600">Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Response Time:</span>
                        <span className="text-sm font-medium text-gray-900">45ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tables:</span>
                        <span className="text-sm font-medium text-gray-900">12</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Storage Health</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Buckets:</span>
                        <span className="text-sm font-medium text-gray-900">2</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Files:</span>
                        <span className="text-sm font-medium text-gray-900">323</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Storage Used:</span>
                        <span className="text-sm font-medium text-gray-900">2.5 GB</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Run Full Diagnostics
                  </button>
                </div>
              </div>
            </div>

            {/* Backup Configuration */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Backup Configuration</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                    <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Retention (days)</label>
                    <input
                      type="number"
                      defaultValue="30"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                      Update Config
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Backup & Restore */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Database Backup & Restore</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Backup Section */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Create Backup</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Backup Type</label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500">
                          <option value="full">Full Database</option>
                          <option value="incidents">Incidents Only</option>
                          <option value="users">Users Only</option>
                          <option value="files">Files Only</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Compression</label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500">
                          <option value="gzip">Gzip (Recommended)</option>
                          <option value="none">No Compression</option>
                        </select>
                      </div>
                      <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Create Backup Now
                      </button>
                    </div>
                  </div>

                  {/* Restore Section */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Restore from Backup</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Backup File</label>
                        <input
                          type="file"
                          accept=".sql,.gz,.backup"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="confirm-restore"
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <label htmlFor="confirm-restore" className="text-sm text-gray-700">
                          I understand this will overwrite current data
                        </label>
                      </div>
                      <button className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50" disabled>
                        Restore Database
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            {/* Create Announcement */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Create New Announcement</h3>
                <button
                  onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  {showAnnouncementForm ? 'Cancel' : 'Create Announcement'}
                </button>
              </div>

              {showAnnouncementForm && (
                <div className="border-t pt-6">
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                        <input
                          type="text"
                          placeholder="Announcement title"
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500">
                          <option value="info">Information</option>
                          <option value="success">Success</option>
                          <option value="warning">Warning</option>
                          <option value="error">Error</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500">
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                        <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500">
                          <option value="all">All Users</option>
                          <option value="users">Regular Users Only</option>
                          <option value="police">Police Officers Only</option>
                          <option value="admins">Admins Only</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                      <textarea
                        rows={4}
                        placeholder="Announcement content..."
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Send as notification to all users</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Pin to dashboard</span>
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => setShowAnnouncementForm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                      >
                        Publish Announcement
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Manage Announcements */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Manage Announcements</h3>
                <div className="flex items-center space-x-3">
                  <select className="rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500">
                    <option value="all">All Types</option>
                    <option value="info">Information</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                  <select className="rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500">
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                            announcement.type === 'info' ? 'bg-blue-500' :
                            announcement.type === 'success' ? 'bg-green-500' :
                            announcement.type === 'warning' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}>
                            {announcement.type}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                            announcement.priority === 'low' ? 'bg-gray-500' :
                            announcement.priority === 'medium' ? 'bg-yellow-500' :
                            announcement.priority === 'high' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}>
                            {announcement.priority}
                          </span>
                          {announcement.is_active && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">{announcement.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                          <span>Views: 1,234</span>
                          <span>Status: {announcement.is_active ? 'Published' : 'Draft'}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-800" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-800" title="Toggle Status">
                          {announcement.is_active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </button>
                        <button className="text-red-600 hover:text-red-800" title="Delete">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* App Update Management */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">App Update Management</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Version</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={appSettings.app_version}
                        readOnly
                        className="w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                      />
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Latest</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Update Channel</label>
                    <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500">
                      <option value="stable">Stable</option>
                      <option value="beta">Beta</option>
                      <option value="alpha">Alpha</option>
                    </select>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Available Updates</h4>
                      <p className="text-sm text-gray-600">Check for new versions and manage updates</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Check for Updates
                      </button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                        Download Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Settings */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Application Settings</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">App Name</label>
                    <input
                      type="text"
                      value={appSettings.app_name}
                      onChange={(e) => updateAppSettings('app_name', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">App Version</label>
                    <input
                      type="text"
                      value={appSettings.app_version}
                      onChange={(e) => updateAppSettings('app_version', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Maintenance Message</label>
                  <textarea
                    rows={3}
                    value={appSettings.maintenance_message}
                    onChange={(e) => updateAppSettings('maintenance_message', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Feature Flags</h4>
                  <div className="space-y-3">
                    {Object.entries(appSettings.feature_flags || {}).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 capitalize">
                          {feature.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => updateAppSettings('feature_flags', {
                            ...appSettings.feature_flags,
                            [feature]: !enabled
                          })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                            enabled ? 'bg-red-600' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            enabled ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Analytics</h3>
              <p className="text-gray-600">
                Comprehensive analytics dashboard with charts, trends, and detailed insights
                will be implemented here. This will include user behavior analysis, incident
                patterns, and system performance metrics.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SuperAdminDashboard
