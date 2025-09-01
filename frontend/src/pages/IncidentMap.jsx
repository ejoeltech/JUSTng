import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, Circle } from 'react-leaflet'
import L, { Icon, DivIcon } from '../utils/leafletFix'
import { 
  Filter, 
  Search, 
  MapPin, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Layers,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  BarChart3,
  Download,
  Share2,
  Flame,
  Target,
  Route
} from 'lucide-react'
import apiService from '../services/api'
import { toast } from 'react-hot-toast'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

// Custom marker icons
const createCustomIcon = (severity) => {
  const colors = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#F97316',
    critical: '#EF4444'
  }
  
  return new DivIcon({
    html: `
      <div style="
        background-color: ${colors[severity] || '#6B7280'};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 10px;
      ">
        ${severity.charAt(0).toUpperCase()}
      </div>
    `,
    className: 'custom-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  })
}

// Map controls component
const MapControls = ({ onZoomIn, onZoomOut, onResetView, onToggleLayers }) => {
  return (
    <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2">
      <div className="flex flex-col space-y-2">
        <button
          onClick={onZoomIn}
          className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={onResetView}
          className="p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          title="Reset View"
        >
          <Layers className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// Legend component
const MapLegend = ({ filters, onFilterChange }) => {
  const severityColors = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#F97316',
    critical: '#EF4444'
  }

  const statusColors = {
    reported: '#3B82F6',
    investigating: '#F59E0B',
    under_review: '#F97316',
    resolved: '#10B981',
    closed: '#6B7280'
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-xs">
      <h3 className="font-semibold text-gray-900 mb-3">Map Legend</h3>
      
      {/* Severity Legend */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Severity</h4>
        <div className="space-y-2">
          {Object.entries(severityColors).map(([severity, color]) => (
            <div key={severity} className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-600 capitalize">{severity}</span>
              <input
                type="checkbox"
                checked={!filters.severity || filters.severity === severity}
                onChange={() => onFilterChange('severity', filters.severity === severity ? '' : severity)}
                className="ml-auto"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Status Legend */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
        <div className="space-y-2">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</span>
              <input
                type="checkbox"
                checked={!filters.status || filters.status === status}
                onChange={() => onFilterChange('status', filters.status === status ? '' : status)}
                className="ml-auto"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-2 border-t border-gray-200">
        <button
          onClick={() => onFilterChange('reset')}
          className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Clear All Filters
        </button>
      </div>
    </div>
  )
}

// Incident Map component
const IncidentMap = () => {
  const { user, userRole } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [filteredIncidents, setFilteredIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    category: '',
    search: '',
    dateRange: '30' // days
  })
  const [mapCenter, setMapCenter] = useState([9.0820, 8.6753]) // Nigeria center
  const [mapZoom, setMapZoom] = useState(6)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const mapRef = useRef(null)

  // Fetch incidents from database
  useEffect(() => {
    if (user) {
      fetchIncidents()
    }
  }, [user, filters])

  // Filter incidents based on current filters
  useEffect(() => {
    let filtered = [...incidents]

    if (filters.status) {
      filtered = filtered.filter(incident => incident.status === filters.status)
    }
    if (filters.severity) {
      filtered = filtered.filter(incident => incident.severity === filters.severity)
    }
    if (filters.category) {
      filtered = filtered.filter(incident => incident.category === filters.category)
    }
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(incident => 
        incident.title.toLowerCase().includes(searchTerm) ||
        incident.description.toLowerCase().includes(searchTerm) ||
        incident.location?.address?.toLowerCase().includes(searchTerm)
      )
    }

    setFilteredIncidents(filtered)
  }, [incidents, filters])

  const fetchIncidents = async () => {
    try {
      setLoading(true)
      console.log('Fetching incidents...')
      
      // Get incidents based on user role
      const result = await apiService.incidents.getAll({
        ...filters,
        limit: 1000 // Get more incidents for map
      })

      console.log('Incidents API response:', result)

      if (result.incidents) {
        setIncidents(result.incidents)
        
        // Update map center if incidents exist
        if (result.incidents.length > 0) {
          const validLocations = result.incidents.filter(incident => 
            incident.location && incident.location.lat && incident.location.lng
          )
          
          if (validLocations.length > 0) {
            const avgLat = validLocations.reduce((sum, incident) => sum + incident.location.lat, 0) / validLocations.length
            const avgLng = validLocations.reduce((sum, incident) => sum + incident.location.lng, 0) / validLocations.length
            setMapCenter([avgLat, avgLng])
            setMapZoom(8)
          }
        }
      } else {
        console.warn('No incidents data in response:', result)
        setIncidents([])
      }
    } catch (error) {
      console.error('Error fetching incidents:', error)
      
      // More detailed error logging
      if (error.message) {
        console.error('Error message:', error.message)
      }
      if (error.stack) {
        console.error('Error stack:', error.stack)
      }
      
      // Show specific error message to user
      let errorMessage = 'Failed to load map data'
      if (error.message.includes('401')) {
        errorMessage = 'Authentication failed. Please log in again.'
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again later.'
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection.'
      }
      
      toast.error(errorMessage)
      setIncidents([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    if (key === 'reset') {
      setFilters({
        status: '',
        severity: '',
        category: '',
        search: '',
        dateRange: '30'
      })
    } else {
      setFilters(prev => ({ ...prev, [key]: value }))
    }
  }

  const handleIncidentClick = (incident) => {
    setSelectedIncident(incident)
    
    // Center map on incident
    if (incident.location && incident.location.lat && incident.location.lng) {
      setMapCenter([incident.location.lat, incident.location.lng])
      setMapZoom(14)
    }
  }

  const handleMapZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() + 1)
    }
  }

  const handleMapZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() - 1)
    }
  }

  const handleResetView = () => {
    setMapCenter([9.0820, 8.6753])
    setMapZoom(6)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      reported: '#3B82F6',
      investigating: '#F59E0B',
      under_review: '#F97316',
      resolved: '#10B981',
      closed: '#6B7280'
    }
    return colors[status] || '#6B7280'
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Please log in to view the incident map.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Incident Map</h1>
              <p className="text-gray-600 mt-1">
                View and analyze incidents across Nigeria
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
              
              <button
                onClick={fetchIncidents}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search incidents..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Status</option>
                  <option value="reported">Reported</option>
                  <option value="investigating">Investigating</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Severity</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Categories</option>
                  <option value="harassment">Harassment</option>
                  <option value="assault">Assault</option>
                  <option value="extortion">Extortion</option>
                  <option value="corruption">Corruption</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative h-[calc(100vh-200px)]">
        {loading ? (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-20">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading incidents...</p>
            </div>
          </div>
        ) : incidents.length === 0 ? (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-20">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Incidents Found</h3>
              <p className="text-gray-600 mb-4">There are no incidents to display on the map.</p>
              <button
                onClick={fetchIncidents}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Refresh
              </button>
            </div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Render incident markers */}
            {filteredIncidents.map((incident) => {
              if (!incident.location || !incident.location.lat || !incident.location.lng) {
                return null
              }

              return (
                <Marker
                  key={incident.id}
                  position={[incident.location.lat, incident.location.lng]}
                  icon={createCustomIcon(incident.severity)}
                  eventHandlers={{
                    click: () => handleIncidentClick(incident)
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[250px]">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {incident.title}
                        </h3>
                        <span
                          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                          style={{ backgroundColor: getStatusColor(incident.status) }}
                        >
                          {incident.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2">
                        {incident.description.substring(0, 100)}...
                      </p>
                      
                      <div className="space-y-1 text-xs text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {incident.location.address || 'Location not specified'}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(incident.created_at)}
                        </div>
                        <div className="flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Severity: {incident.severity}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 mt-3 pt-2 border-t border-gray-200">
                        <button className="text-primary-600 hover:text-primary-800 text-xs">
                          <Eye className="h-3 w-3 inline mr-1" />
                          View
                        </button>
                        {userRole === 'admin' || userRole === 'superAdmin' ? (
                          <>
                            <button className="text-gray-600 hover:text-gray-800 text-xs">
                              <Edit className="h-3 w-3 inline mr-1" />
                              Edit
                            </button>
                            <button className="text-red-600 hover:text-red-800 text-xs">
                              <Trash2 className="h-3 w-3 inline mr-1" />
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}

            {/* Map Controls */}
            <MapControls
              onZoomIn={handleMapZoomIn}
              onZoomOut={handleMapZoomOut}
              onResetView={handleResetView}
            />
          </MapContainer>
        )}

        {/* Legend */}
        <MapLegend filters={filters} onFilterChange={handleFilterChange} />

        {/* Incident Details Sidebar */}
        {selectedIncident && (
          <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Incident Details</h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-900">{selectedIncident.title}</h4>
                <p className="text-sm text-gray-600">{selectedIncident.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2 font-medium">{selectedIncident.status}</span>
                </div>
                <div>
                  <span className="text-gray-500">Severity:</span>
                  <span className="ml-2 font-medium">{selectedIncident.severity}</span>
                </div>
                <div>
                  <span className="text-gray-500">Category:</span>
                  <span className="ml-2 font-medium">{selectedIncident.category}</span>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedIncident.created_at)}</span>
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <button className="w-full px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm">
                  View Full Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-6">
              <span>Total Incidents: <strong>{filteredIncidents.length}</strong></span>
              <span>Filtered: <strong>{filteredIncidents.length}</strong></span>
              <span>Map Zoom: <strong>{mapZoom}</strong></span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="flex items-center text-gray-600 hover:text-gray-800">
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </button>
              <button className="flex items-center text-gray-600 hover:text-gray-800">
                <Download className="h-4 w-4 mr-1" />
                Export
              </button>
              <button className="flex items-center text-gray-600 hover:text-gray-800">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IncidentMap
