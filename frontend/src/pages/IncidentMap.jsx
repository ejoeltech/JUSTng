import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { MapPin, Filter, Search, AlertTriangle, Info, Navigation, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import apiService from '../services/api'

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const IncidentMap = () => {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    incident_type: '',
    state: '',
    lga: '',
    date_range: '30'
  })
  const [states, setStates] = useState([])
  const [lgas, setLgas] = useState([])
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [mapCenter, setMapCenter] = useState([9.0820, 8.6753]) // Nigeria center
  const [userLocation, setUserLocation] = useState(null)
  const [mapInstance, setMapInstance] = useState(null)
  const [markers, setMarkers] = useState([])
  
  const mapRef = useRef(null)
  const mapContainerRef = useRef(null)

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch incidents from API
        const incidentsData = await apiService.incidents.getAll(filters)
        setIncidents(incidentsData.incidents || incidentsData || [])

        // TODO: Fetch states and LGAs from API when available
        // For now, use mock data
        setStates([
          { id: 1, name: 'Lagos', code: 'LA' },
          { id: 2, name: 'Kano', code: 'KN' },
          { id: 3, name: 'Rivers', code: 'RI' },
          { id: 4, name: 'Kaduna', code: 'KD' },
          { id: 5, name: 'Katsina', code: 'KT' }
        ])
        
        setLgas([
          { id: 1, name: 'Ikeja', state_id: 1 },
          { id: 2, name: 'Victoria Island', state_id: 1 },
          { id: 3, name: 'Municipal', state_id: 2 },
          { id: 4, name: 'Port Harcourt', state_id: 3 },
          { id: 5, name: 'Kaduna North', state_id: 4 }
        ])
        
        // setIncidents already set above from API call
        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load map data')
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance) return

    const map = L.map(mapContainerRef.current).setView(mapCenter, 6)
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    // Add scale control
    L.control.scale().addTo(map)

    setMapInstance(map)
    mapRef.current = map

    return () => {
      if (map) {
        map.remove()
      }
    }
  }, [mapCenter, mapInstance])

  // Update markers when incidents change
  useEffect(() => {
    if (!mapInstance || !incidents.length) return

    // Clear existing markers
    markers.forEach(marker => marker.remove())
    const newMarkers = []

    // Filter incidents based on current filters
    const filteredIncidents = incidents.filter(incident => {
      if (filters.status && incident.status !== filters.status) return false
      if (filters.severity && incident.severity !== filters.severity) return false
      if (filters.incident_type && incident.incident_type !== filters.incident_type) return false
      if (filters.date_range) {
        const days = parseInt(filters.date_range)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        if (new Date(incident.created_at) < cutoffDate) return false
      }
      return true
    })

    // Create markers for filtered incidents
    filteredIncidents.forEach(incident => {
      const markerColor = getSeverityColor(incident.severity)
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-6 h-6 rounded-full ${markerColor} border-2 border-white shadow-lg flex items-center justify-center">
                 <div class="w-2 h-2 bg-white rounded-full"></div>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })

      const marker = L.marker([incident.latitude, incident.longitude], { icon: customIcon })
        .addTo(mapInstance)
        .bindPopup(createPopupContent(incident))

      marker.on('click', () => {
        setSelectedIncident(incident)
      })

      newMarkers.push(marker)
    })

    setMarkers(newMarkers)

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      const group = new L.featureGroup(newMarkers)
      mapInstance.fitBounds(group.getBounds().pad(0.1))
    }
  }, [mapInstance, incidents, filters, markers])

  // Create popup content for markers
  const createPopupContent = (incident) => {
    return `
      <div class="p-3 max-w-xs">
        <h3 class="font-semibold text-gray-900 mb-2">${incident.title}</h3>
        <p class="text-sm text-gray-600 mb-3">${incident.description}</p>
        <div class="flex items-center justify-between text-xs">
          <span class="px-2 py-1 rounded-full text-white ${getSeverityColor(incident.severity)}">
            ${incident.severity}
          </span>
          <span class="px-2 py-1 rounded-full text-white ${getStatusColor(incident.status)}">
            ${incident.status}
          </span>
        </div>
        <div class="mt-2 text-xs text-gray-500">
          <p>By: ${incident.user.full_name}</p>
          <p>${new Date(incident.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    `
  }

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ latitude, longitude })
        setMapCenter([latitude, longitude])
        
        if (mapInstance) {
          mapInstance.setView([latitude, longitude], 12)
          
          // Add user location marker
          const userMarker = L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: 'user-location-marker',
              html: `<div class="w-8 h-8 rounded-full bg-blue-500 border-4 border-white shadow-lg flex items-center justify-center">
                       <div class="w-3 h-3 bg-white rounded-full"></div>
                     </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            })
          }).addTo(mapInstance)

          // Add user location popup
          userMarker.bindPopup('<div class="p-2"><strong>Your Location</strong></div>')
        }
        
        toast.success('Location updated')
      },
      (error) => {
        toast.error('Failed to get location')
      }
    )
  }

  // Filter incidents
  const filteredIncidents = incidents.filter(incident => {
    if (filters.status && incident.status !== filters.status) return false
    if (filters.severity && incident.severity !== filters.severity) return false
    if (filters.incident_type && incident.incident_type !== filters.incident_type) return false
    if (filters.state) {
      // TODO: Implement state filtering logic
    }
    if (filters.date_range) {
      const days = parseInt(filters.date_range)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      if (new Date(incident.created_at) < cutoffDate) return false
    }
    return true
  })

  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'high': return 'bg-orange-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'reported': return 'bg-blue-500'
      case 'investigating': return 'bg-yellow-500'
      case 'resolved': return 'bg-green-500'
      case 'closed': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading map...</p>
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
                Incident Map
              </h1>
              <p className="text-gray-600 mt-1">
                View and track harassment incidents across Nigeria
              </p>
            </div>
            <button
              onClick={getCurrentLocation}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Navigation className="h-4 w-4" />
              <span>My Location</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Filter className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              </div>

              <div className="space-y-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="reported">Reported</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Severity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity
                  </label>
                  <select
                    value={filters.severity}
                    onChange={(e) => handleFilterChange('severity', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  >
                    <option value="">All Severities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Incident Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Incident Type
                  </label>
                  <select
                    value={filters.incident_type}
                    onChange={(e) => handleFilterChange('incident_type', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  >
                    <option value="">All Types</option>
                    <option value="harassment">Harassment</option>
                    <option value="assault">Assault</option>
                    <option value="extortion">Extortion</option>
                    <option value="unlawful_arrest">Unlawful Arrest</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* State Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <select
                    value={filters.state}
                    onChange={(e) => handleFilterChange('state', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  >
                    <option value="">All States</option>
                    {states.map(state => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <select
                    value={filters.date_range}
                    onChange={(e) => handleFilterChange('date_range', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  >
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 3 months</option>
                    <option value="365">Last year</option>
                    <option value="">All time</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={() => setFilters({
                    status: '',
                    severity: '',
                    incident_type: '',
                    state: '',
                    lga: '',
                    date_range: '30'
                  })}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Incidents:</span>
                  <span className="font-semibold">{filteredIncidents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">High Priority:</span>
                  <span className="font-semibold text-red-600">
                    {filteredIncidents.filter(i => i.severity === 'high' || i.severity === 'critical').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Under Investigation:</span>
                  <span className="font-semibold text-yellow-600">
                    {filteredIncidents.filter(i => i.status === 'investigating').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">Low Severity</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-gray-600">Medium Severity</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <span className="text-sm text-gray-600">High Severity</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-600">Critical Severity</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600">Your Location</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Interactive Map */}
              <div 
                ref={mapContainerRef} 
                className="h-96 w-full"
                style={{ minHeight: '400px' }}
              ></div>

              {/* Incident List Below Map */}
              <div className="p-4 border-t">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Incidents ({filteredIncidents.length})
                </h3>
                
                {filteredIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No incidents found with current filters</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredIncidents.map(incident => (
                      <div
                        key={incident.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">
                              {incident.title}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {incident.description}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>By: {incident.user.full_name}</span>
                              <span>{new Date(incident.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getSeverityColor(incident.severity)}`}>
                              {incident.severity}
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(incident.status)}`}>
                              {incident.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Incident Details
                </h3>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Title:</span>
                  <p className="text-gray-900">{selectedIncident.title}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Description:</span>
                  <p className="text-gray-900">{selectedIncident.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(selectedIncident.status)}`}>
                      {selectedIncident.status}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Severity:</span>
                    <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium text-white ${getSeverityColor(selectedIncident.severity)}`}>
                      {selectedIncident.severity}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Location:</span>
                  <p className="text-gray-900">
                    {selectedIncident.address || `${selectedIncident.latitude.toFixed(6)}, ${selectedIncident.longitude.toFixed(6)}`}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Reported:</span>
                  <p className="text-gray-900">
                    {new Date(selectedIncident.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IncidentMap
