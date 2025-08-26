import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Shield, 
  Map, 
  FileText, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  Eye,
  Settings
} from 'lucide-react'
import OfflineQueueManager from '../components/OfflineQueueManager'
import BackendStatus from '../components/BackendStatus'

const Dashboard = () => {
  const { user, userRole } = useAuth()
  const [stats, setStats] = useState({
    totalIncidents: 0,
    pendingIncidents: 0,
    resolvedIncidents: 0,
    recentIncidents: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch user stats from API
    // For now, using mock data
    setTimeout(() => {
      setStats({
        totalIncidents: 12,
        pendingIncidents: 3,
        resolvedIncidents: 9,
        recentIncidents: [
          {
            id: 1,
            title: 'Police harassment at Lekki',
            status: 'investigating',
            date: '2024-08-23',
            severity: 'high'
          },
          {
            id: 2,
            title: 'Unlawful arrest in Victoria Island',
            status: 'reported',
            date: '2024-08-22',
            severity: 'medium'
          }
        ]
      })
      setIsLoading(false)
    }, 1000)
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case 'reported':
        return 'bg-yellow-100 text-yellow-800'
      case 'investigating':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Backend Status Check */}
      <BackendStatus />
      
      {/* Offline Queue Manager */}
      <OfflineQueueManager />
      
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.email?.split('@')[0]}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your reports and the community.
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/report"
              className="btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Report Incident
            </Link>
            <Link
              to="/map"
              className="btn-secondary flex items-center"
            >
              <Map className="h-4 w-4 mr-2" />
              View Map
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Incidents
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.totalIncidents}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Pending
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.pendingIncidents}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Resolved
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {stats.resolvedIncidents}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Your Role
                </dt>
                <dd className="text-lg font-medium text-gray-900 capitalize">
                  {userRole}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Incidents
            </h3>
            <Link
              to="/map"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              View all
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {stats.recentIncidents.length > 0 ? (
            stats.recentIncidents.map((incident) => (
              <div key={incident.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        {incident.title}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span>{incident.date}</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/incident/${incident.id}`}
                      className="text-primary-600 hover:text-primary-500 p-1"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No incidents yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by reporting your first incident.
              </p>
              <div className="mt-6">
                <Link
                  to="/report"
                  className="btn-primary"
                >
                  Report Incident
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/report"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Plus className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h4 className="font-medium text-gray-900">Report Incident</h4>
              <p className="text-sm text-gray-500">Report a new harassment incident</p>
            </div>
          </Link>

          <Link
            to="/map"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Map className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h4 className="font-medium text-gray-900">View Map</h4>
              <p className="text-sm text-gray-500">See all reported incidents</p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <Settings className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h4 className="font-medium text-gray-900">Profile Settings</h4>
              <p className="text-sm text-gray-500">Update your account</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Admin Actions (if applicable) */}
      {userRole === 'admin' || userRole === 'superadmin' ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Admin Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/admin"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <Shield className="h-6 w-6 text-primary-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Admin Dashboard</h4>
                <p className="text-sm text-gray-500">Manage incidents and users</p>
              </div>
            </Link>

            {userRole === 'superadmin' && (
              <Link
                to="/super-admin"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <Settings className="h-6 w-6 text-primary-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">Super Admin</h4>
                  <p className="text-sm text-gray-500">System configuration</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Dashboard
