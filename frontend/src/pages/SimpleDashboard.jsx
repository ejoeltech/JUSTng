import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'

const SimpleDashboard = () => {
  const { user, userRole } = useAuth()
  const [stats, setStats] = useState({
    totalIncidents: 0,
    activeIncidents: 0,
    resolvedIncidents: 0,
    recentActivity: 0
  })
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadLocalData()
  }, [user])

  const loadLocalData = () => {
    try {
      setLoading(true)
      
      // Get incidents from localStorage
      const localIncidents = JSON.parse(localStorage.getItem('just_local_incidents') || '[]')
      const userIncidents = localIncidents.filter(incident => 
        incident.reportedBy === user?.id
      )

      // Calculate stats
      const newStats = {
        totalIncidents: userIncidents.length,
        activeIncidents: userIncidents.filter(i => i.status === 'open' || i.status === 'in_progress').length,
        resolvedIncidents: userIncidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
        recentActivity: userIncidents.filter(i => {
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return new Date(i.createdAt) > weekAgo
        }).length
      }

      setStats(newStats)
      setIncidents(userIncidents.slice(0, 5)) // Show latest 5
      
    } catch (error) {
      console.error('Error loading local data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h2>
          <Link to="/login" className="btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user.fullName || user.email?.split('@')[0]}!
        </h1>
        <p className="text-gray-600">Here's what's happening with your incidents</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalIncidents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <div className="w-6 h-6 bg-yellow-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Cases</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeIncidents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <div className="w-6 h-6 bg-green-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.resolvedIncidents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <div className="w-6 h-6 bg-purple-600 rounded"></div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent Activity</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentActivity}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Link to="/report" className="btn-primary">
            📝 Report New Incident
          </Link>
          <Link to="/map" className="btn-secondary">
            🗺️ View Incident Map
          </Link>
          <a href="/create-demo-data.html" className="btn-secondary">
            📊 Create Demo Data
          </a>
          <a href="/admin-users.html" className="btn-secondary">
            👥 View Users
          </a>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Recent Incidents</h3>
          <Link to="/report" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            + Report New Incident
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading incidents...</p>
          </div>
        ) : incidents.length > 0 ? (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div key={incident.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{incident.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{incident.description?.substring(0, 100)}...</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {incident.severity}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        incident.status === 'open' ? 'bg-blue-100 text-blue-800' :
                        incident.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {incident.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                📄
              </div>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No incidents yet</h4>
            <p className="text-gray-600 mb-4">Get started by reporting your first incident or creating demo data.</p>
            <div className="space-x-3">
              <Link to="/report" className="btn-primary">
                Report Incident
              </Link>
              <a href="/create-demo-data.html" className="btn-secondary">
                Create Demo Data
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">🔧 Debug Info</h4>
        <p className="text-sm text-gray-600">
          User ID: {user.id} | Role: {userRole} | Local Mode: Active
        </p>
        <p className="text-sm text-gray-600">
          Incidents in storage: {JSON.parse(localStorage.getItem('just_local_incidents') || '[]').length}
        </p>
      </div>
    </div>
  )
}

export default SimpleDashboard
