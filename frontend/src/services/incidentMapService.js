// Incident Map Service for Real-time Incident Visualization
import { nigerianStates, getStateById, getLGAsByStateId } from '../data/nigerianStates'

class IncidentMapService {
  constructor() {
    this.incidents = []
    this.clusters = []
    this.filters = {
      severity: '',
      status: '',
      incidentType: '',
      state: '',
      lga: '',
      dateRange: '30',
      search: ''
    }
    this.mapBounds = null
    this.clusterRadius = 50 // pixels
  }

  // Set incidents data
  setIncidents(incidents) {
    this.incidents = incidents
    this.updateClusters()
  }

  // Add new incident
  addIncident(incident) {
    this.incidents.unshift(incident)
    this.updateClusters()
  }

  // Update existing incident
  updateIncident(incidentId, updates) {
    const index = this.incidents.findIndex(inc => inc.id === incidentId)
    if (index !== -1) {
      this.incidents[index] = { ...this.incidents[index], ...updates }
      this.updateClusters()
    }
  }

  // Remove incident
  removeIncident(incidentId) {
    this.incidents = this.incidents.filter(inc => inc.id !== incidentId)
    this.updateClusters()
  }

  // Set map filters
  setFilters(filters) {
    this.filters = { ...this.filters, ...filters }
    this.updateClusters()
  }

  // Get filtered incidents
  getFilteredIncidents() {
    let filtered = [...this.incidents]

    // Apply severity filter
    if (this.filters.severity) {
      filtered = filtered.filter(inc => inc.severity === this.filters.severity)
    }

    // Apply status filter
    if (this.filters.status) {
      filtered = filtered.filter(inc => inc.status === this.filters.status)
    }

    // Apply incident type filter
    if (this.filters.incidentType) {
      filtered = filtered.filter(inc => inc.incident_type === this.filters.incidentType)
    }

    // Apply state filter
    if (this.filters.state) {
      filtered = filtered.filter(inc => inc.state === this.filters.state)
    }

    // Apply LGA filter
    if (this.filters.lga) {
      filtered = filtered.filter(inc => inc.lga === this.filters.lga)
    }

    // Apply date range filter
    if (this.filters.dateRange) {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(this.filters.dateRange))
      filtered = filtered.filter(inc => new Date(inc.incident_date) >= daysAgo)
    }

    // Apply search filter
    if (this.filters.search) {
      const searchTerm = this.filters.search.toLowerCase()
      filtered = filtered.filter(inc => 
        inc.title.toLowerCase().includes(searchTerm) ||
        inc.description.toLowerCase().includes(searchTerm) ||
        inc.address.toLowerCase().includes(searchTerm) ||
        (inc.state && getStateById(inc.state)?.name.toLowerCase().includes(searchTerm)) ||
        (inc.lga && inc.lga.toLowerCase().includes(searchTerm))
      )
    }

    return filtered
  }

  // Update clusters based on current incidents and filters
  updateClusters() {
    const filteredIncidents = this.getFilteredIncidents()
    this.clusters = this.createClusters(filteredIncidents)
  }

  // Create clusters from incidents
  createClusters(incidents) {
    if (!incidents.length) return []

    const clusters = []
    const processed = new Set()

    incidents.forEach((incident, index) => {
      if (processed.has(index)) return

      const cluster = {
        id: `cluster_${index}`,
        incidents: [incident],
        center: {
          lat: incident.latitude,
          lng: incident.longitude
        },
        severity: incident.severity,
        count: 1,
        bounds: {
          north: incident.latitude,
          south: incident.latitude,
          east: incident.longitude,
          west: incident.longitude
        }
      }

      processed.add(index)

      // Find nearby incidents to cluster
      incidents.forEach((otherIncident, otherIndex) => {
        if (index === otherIndex || processed.has(otherIndex)) return

        const distance = this.calculateDistance(
          incident.latitude, incident.longitude,
          otherIncident.latitude, otherIncident.longitude
        )

        // Cluster incidents within 1km radius
        if (distance <= 1) {
          cluster.incidents.push(otherIncident)
          cluster.count++
          processed.add(otherIndex)

          // Update cluster center
          cluster.center.lat = cluster.incidents.reduce((sum, inc) => sum + inc.latitude, 0) / cluster.count
          cluster.center.lng = cluster.incidents.reduce((sum, inc) => sum + inc.longitude, 0) / cluster.count

          // Update bounds
          cluster.bounds.north = Math.max(cluster.bounds.north, otherIncident.latitude)
          cluster.bounds.south = Math.min(cluster.bounds.south, otherIncident.latitude)
          cluster.bounds.east = Math.max(cluster.bounds.east, otherIncident.longitude)
          cluster.bounds.west = Math.min(cluster.bounds.west, otherIncident.longitude)
        }
      })

      clusters.push(cluster)
    })

    return clusters
  }

  // Calculate distance between two coordinates in kilometers
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Convert degrees to radians
  deg2rad(deg) {
    return deg * (Math.PI/180)
  }

  // Get incidents by location (state/LGA)
  getIncidentsByLocation(stateId = null, lgaName = null) {
    let filtered = [...this.incidents]

    if (stateId) {
      filtered = filtered.filter(inc => inc.state === stateId)
    }

    if (lgaName) {
      filtered = filtered.filter(inc => inc.lga === lgaName)
    }

    return filtered
  }

  // Get incidents by date range
  getIncidentsByDateRange(startDate, endDate) {
    return this.incidents.filter(inc => {
      const incidentDate = new Date(inc.incident_date)
      return incidentDate >= startDate && incidentDate <= endDate
    })
  }

  // Get incidents by severity
  getIncidentsBySeverity(severity) {
    return this.incidents.filter(inc => inc.severity === severity)
  }

  // Get incidents by status
  getIncidentsByStatus(status) {
    return this.incidents.filter(inc => inc.status === status)
  }

  // Get incidents by type
  getIncidentsByType(incidentType) {
    return this.incidents.filter(inc => inc.incident_type === incidentType)
  }

  // Get map statistics
  getMapStatistics() {
    const filteredIncidents = this.getFilteredIncidents()
    
    return {
      total: filteredIncidents.length,
      bySeverity: {
        low: filteredIncidents.filter(inc => inc.severity === 'low').length,
        medium: filteredIncidents.filter(inc => inc.severity === 'medium').length,
        high: filteredIncidents.filter(inc => inc.severity === 'high').length,
        critical: filteredIncidents.filter(inc => inc.severity === 'critical').length
      },
      byStatus: {
        reported: filteredIncidents.filter(inc => inc.status === 'reported').length,
        investigating: filteredIncidents.filter(inc => inc.status === 'investigating').length,
        under_review: filteredIncidents.filter(inc => inc.status === 'under_review').length,
        resolved: filteredIncidents.filter(inc => inc.status === 'resolved').length,
        closed: filteredIncidents.filter(inc => inc.status === 'closed').length
      },
      byType: {
        harassment: filteredIncidents.filter(inc => inc.incident_type === 'harassment').length,
        assault: filteredIncidents.filter(inc => inc.incident_type === 'assault').length,
        extortion: filteredIncidents.filter(inc => inc.incident_type === 'extortion').length,
        false_accusation: filteredIncidents.filter(inc => inc.incident_type === 'false_accusation').length,
        unlawful_detention: filteredIncidents.filter(inc => inc.incident_type === 'unlawful_detention').length,
        property_damage: filteredIncidents.filter(inc => inc.incident_type === 'property_damage').length,
        other: filteredIncidents.filter(inc => inc.incident_type === 'other').length
      },
      byState: this.getIncidentsByState(),
      clusters: this.clusters.length,
      dateRange: this.filters.dateRange
    }
  }

  // Get incidents grouped by state
  getIncidentsByState() {
    const stateStats = {}
    
    nigerianStates.forEach(state => {
      const stateIncidents = this.incidents.filter(inc => inc.state === state.id)
      stateStats[state.id] = {
        name: state.name,
        count: stateIncidents.length,
        severity: {
          low: stateIncidents.filter(inc => inc.severity === 'low').length,
          medium: stateIncidents.filter(inc => inc.severity === 'medium').length,
          high: stateIncidents.filter(inc => inc.severity === 'high').length,
          critical: stateIncidents.filter(inc => inc.severity === 'critical').length
        }
      }
    })

    return stateStats
  }

  // Get heatmap data for visualization
  getHeatmapData() {
    return this.getFilteredIncidents().map(incident => ({
      lat: incident.latitude,
      lng: incident.longitude,
      intensity: this.getSeverityIntensity(incident.severity)
    }))
  }

  // Get severity intensity for heatmap
  getSeverityIntensity(severity) {
    const intensities = {
      low: 0.25,
      medium: 0.5,
      high: 0.75,
      critical: 1.0
    }
    return intensities[severity] || 0.5
  }

  // Export filtered incidents data
  exportIncidents(format = 'json') {
    const data = this.getFilteredIncidents()
    
    if (format === 'csv') {
      return this.convertToCSV(data)
    }
    
    return JSON.stringify(data, null, 2)
  }

  // Convert incidents to CSV format
  convertToCSV(incidents) {
    if (!incidents.length) return ''
    
    const headers = [
      'ID', 'Title', 'Description', 'Type', 'Severity', 'Status', 'Date',
      'Address', 'State', 'LGA', 'Latitude', 'Longitude', 'Reporter'
    ]
    
    const rows = incidents.map(inc => [
      inc.id,
      `"${inc.title}"`,
      `"${inc.description}"`,
      inc.incident_type,
      inc.severity,
      inc.status,
      inc.incident_date,
      `"${inc.address}"`,
      getStateById(inc.state)?.name || inc.state,
      inc.lga,
      inc.latitude,
      inc.longitude,
      inc.is_anonymous ? 'Anonymous' : inc.reporter_name
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  // Get suggested map center based on incidents
  getSuggestedMapCenter() {
    if (!this.incidents.length) {
      return { lat: 9.0820, lng: 8.6753, zoom: 6 } // Nigeria center
    }

    const filteredIncidents = this.getFilteredIncidents()
    
    if (filteredIncidents.length === 0) {
      return { lat: 9.0820, lng: 8.6753, zoom: 6 }
    }

    if (filteredIncidents.length === 1) {
      const incident = filteredIncidents[0]
      return { lat: incident.latitude, lng: incident.longitude, zoom: 12 }
    }

    // Calculate center of all filtered incidents
    const totalLat = filteredIncidents.reduce((sum, inc) => sum + inc.latitude, 0)
    const totalLng = filteredIncidents.reduce((sum, inc) => sum + inc.longitude, 0)
    const centerLat = totalLat / filteredIncidents.length
    const centerLng = totalLng / filteredIncidents.length

    // Calculate bounds to determine zoom level
    const bounds = this.calculateBounds(filteredIncidents)
    const zoom = this.calculateZoomLevel(bounds)

    return { lat: centerLat, lng: centerLng, zoom }
  }

  // Calculate bounds for incidents
  calculateBounds(incidents) {
    if (!incidents.length) return null

    const lats = incidents.map(inc => inc.latitude)
    const lngs = incidents.map(inc => inc.longitude)

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    }
  }

  // Calculate appropriate zoom level based on bounds
  calculateZoomLevel(bounds) {
    if (!bounds) return 6

    const latDiff = bounds.north - bounds.south
    const lngDiff = bounds.east - bounds.west
    const maxDiff = Math.max(latDiff, lngDiff)

    if (maxDiff > 10) return 5
    if (maxDiff > 5) return 6
    if (maxDiff > 2) return 7
    if (maxDiff > 1) return 8
    if (maxDiff > 0.5) return 9
    if (maxDiff > 0.1) return 10
    if (maxDiff > 0.05) return 11
    return 12
  }

  // Search incidents by text
  searchIncidents(query) {
    if (!query.trim()) return this.incidents

    const searchTerm = query.toLowerCase()
    
    return this.incidents.filter(inc => 
      inc.title.toLowerCase().includes(searchTerm) ||
      inc.description.toLowerCase().includes(searchTerm) ||
      inc.address.toLowerCase().includes(searchTerm) ||
      (inc.state && getStateById(inc.state)?.name.toLowerCase().includes(searchTerm)) ||
      (inc.lga && inc.lga.toLowerCase().includes(searchTerm)) ||
      inc.incident_type.toLowerCase().includes(searchTerm) ||
      inc.severity.toLowerCase().includes(searchTerm)
    )
  }

  // Get recent incidents (last 24 hours)
  getRecentIncidents() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    return this.incidents.filter(inc => 
      new Date(inc.incident_date) >= yesterday
    )
  }

  // Get trending locations (areas with most incidents)
  getTrendingLocations(limit = 10) {
    const locationCounts = {}
    
    this.incidents.forEach(inc => {
      const key = `${inc.state}-${inc.lga}`
      if (!locationCounts[key]) {
        locationCounts[key] = {
          state: inc.state,
          lga: inc.lga,
          count: 0,
          incidents: []
        }
      }
      locationCounts[key].count++
      locationCounts[key].incidents.push(inc)
    })

    return Object.values(locationCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }
}

// Create singleton instance
const incidentMapService = new IncidentMapService()

export default incidentMapService
