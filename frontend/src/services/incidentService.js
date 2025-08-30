// Incident Service for Database Integration and Real-time Features
import { createClient } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'

class IncidentService {
  constructor() {
    this.supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    )
    
    this.subscriptions = new Map()
    this.realTimeEnabled = false
    this.incidentCache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  // Initialize real-time subscriptions
  async enableRealTime() {
    if (this.realTimeEnabled) return

    try {
      // Subscribe to incident changes
      const incidentSubscription = this.supabase
        .channel('incident-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'incidents'
          },
          (payload) => {
            this.handleIncidentChange(payload)
          }
        )
        .subscribe()

      // Subscribe to file changes
      const fileSubscription = this.supabase
        .channel('file-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'incident_files'
          },
          (payload) => {
            this.handleFileChange(payload)
          }
        )
        .subscribe()

      this.subscriptions.set('incidents', incidentSubscription)
      this.subscriptions.set('files', fileSubscription)
      this.realTimeEnabled = true

      console.log('Real-time subscriptions enabled')
    } catch (error) {
      console.error('Failed to enable real-time:', error)
      toast.error('Failed to enable real-time updates')
    }
  }

  // Disable real-time subscriptions
  disableRealTime() {
    this.subscriptions.forEach((subscription, key) => {
      subscription.unsubscribe()
    })
    this.subscriptions.clear()
    this.realTimeEnabled = false
    console.log('Real-time subscriptions disabled')
  }

  // Handle incident changes from real-time subscription
  handleIncidentChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        this.incidentCache.set(newRecord.id, {
          data: newRecord,
          timestamp: Date.now()
        })
        this.emitIncidentUpdate('created', newRecord)
        break
      
      case 'UPDATE':
        this.incidentCache.set(newRecord.id, {
          data: newRecord,
          timestamp: Date.now()
        })
        this.emitIncidentUpdate('updated', newRecord, oldRecord)
        break
      
      case 'DELETE':
        this.incidentCache.delete(oldRecord.id)
        this.emitIncidentUpdate('deleted', null, oldRecord)
        break
    }
  }

  // Handle file changes from real-time subscription
  handleFileChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'INSERT':
        this.emitFileUpdate('created', newRecord)
        break
      
      case 'UPDATE':
        this.emitFileUpdate('updated', newRecord, oldRecord)
        break
      
      case 'DELETE':
        this.emitFileUpdate('deleted', null, oldRecord)
        break
    }
  }

  // Emit incident updates to listeners
  emitIncidentUpdate(type, newRecord, oldRecord = null) {
    const event = new CustomEvent('incidentUpdate', {
      detail: { type, newRecord, oldRecord }
    })
    window.dispatchEvent(event)
  }

  // Emit file updates to listeners
  emitFileUpdate(type, newRecord, oldRecord = null) {
    const event = new CustomEvent('fileUpdate', {
      detail: { type, newRecord, oldRecord }
    })
    window.dispatchEvent(event)
  }

  // Create new incident
  async createIncident(incidentData, userId) {
    try {
      const { data, error } = await this.supabase
        .from('incidents')
        .insert({
          ...incidentData,
          reporter_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'reported'
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Cache the new incident
      this.incidentCache.set(data.id, {
        data,
        timestamp: Date.now()
      })

      toast.success('Incident reported successfully')
      return { success: true, data }

    } catch (error) {
      console.error('Create incident error:', error)
      toast.error(`Failed to report incident: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  // Get incident by ID
  async getIncidentById(incidentId) {
    // Check cache first
    const cached = this.incidentCache.get(incidentId)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { success: true, data: cached.data }
    }

    try {
      const { data, error } = await this.supabase
        .from('incidents')
        .select(`
          *,
          reporter:users!incidents_reporter_id_fkey(
            id,
            full_name,
            email,
            phone
          ),
          files:incident_files(
            id,
            filename,
            original_filename,
            public_url,
            file_size,
            mime_type,
            upload_date
          )
        `)
        .eq('id', incidentId)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Cache the incident
      this.incidentCache.set(incidentId, {
        data,
        timestamp: Date.now()
      })

      return { success: true, data }

    } catch (error) {
      console.error('Get incident error:', error)
      return { success: false, error: error.message }
    }
  }

  // Get all incidents with filtering
  async getIncidents(filters = {}, page = 1, limit = 20) {
    try {
      let query = this.supabase
        .from('incidents')
        .select(`
          *,
          reporter:users!incidents_reporter_id_fkey(
            id,
            full_name,
            email
          ),
          files:incident_files(count)
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.incidentType) {
        query = query.eq('incident_type', filters.incidentType)
      }
      if (filters.state) {
        query = query.eq('state', filters.state)
      }
      if (filters.lga) {
        query = query.eq('lga', filters.lga)
      }
      if (filters.dateFrom) {
        query = query.gte('incident_date', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('incident_date', filters.dateTo)
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      // Apply pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        throw new Error(error.message)
      }

      // Cache incidents
      data.forEach(incident => {
        this.incidentCache.set(incident.id, {
          data: incident,
          timestamp: Date.now()
        })
      })

      return {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      }

    } catch (error) {
      console.error('Get incidents error:', error)
      return { success: false, error: error.message }
    }
  }

  // Update incident
  async updateIncident(incidentId, updates, userId) {
    try {
      const { data, error } = await this.supabase
        .from('incidents')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', incidentId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Update cache
      this.incidentCache.set(incidentId, {
        data,
        timestamp: Date.now()
      })

      toast.success('Incident updated successfully')
      return { success: true, data }

    } catch (error) {
      console.error('Update incident error:', error)
      toast.error(`Failed to update incident: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  // Delete incident (soft delete)
  async deleteIncident(incidentId, userId) {
    try {
      const { error } = await this.supabase
        .from('incidents')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId)

      if (error) {
        throw new Error(error.message)
      }

      // Remove from cache
      this.incidentCache.delete(incidentId)

      toast.success('Incident deleted successfully')
      return { success: true }

    } catch (error) {
      console.error('Delete incident error:', error)
      toast.error(`Failed to delete incident: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  // Get incidents by location (state/LGA)
  async getIncidentsByLocation(stateId = null, lgaName = null, limit = 50) {
    try {
      let query = this.supabase
        .from('incidents')
        .select(`
          *,
          reporter:users!incidents_reporter_id_fkey(
            id,
            full_name
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (stateId) {
        query = query.eq('state', stateId)
      }
      if (lgaName) {
        query = query.eq('lga', lgaName)
      }

      const { data, error } = await query.limit(limit)

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, data }

    } catch (error) {
      console.error('Get incidents by location error:', error)
      return { success: false, error: error.message }
    }
  }

  // Get incidents by date range
  async getIncidentsByDateRange(startDate, endDate, limit = 100) {
    try {
      const { data, error } = await this.supabase
        .from('incidents')
        .select(`
          *,
          reporter:users!incidents_reporter_id_fkey(
            id,
            full_name
          )
        `)
        .gte('incident_date', startDate)
        .lte('incident_date', endDate)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, data }

    } catch (error) {
      console.error('Get incidents by date range error:', error)
      return { success: false, error: error.message }
    }
  }

  // Get incident statistics
  async getIncidentStatistics(filters = {}) {
    try {
      let query = this.supabase
        .from('incidents')
        .select('*', { count: 'exact' })
        .eq('is_deleted', false)

      // Apply filters
      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.state) {
        query = query.eq('state', filters.state)
      }
      if (filters.dateFrom) {
        query = query.gte('incident_date', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('incident_date', filters.dateTo)
      }

      const { data, error, count } = await query

      if (error) {
        throw new Error(error.message)
      }

      // Calculate statistics
      const stats = {
        total: count || 0,
        bySeverity: {},
        byStatus: {},
        byType: {},
        byState: {},
        byDate: {}
      }

      data.forEach(incident => {
        // Severity breakdown
        stats.bySeverity[incident.severity] = (stats.bySeverity[incident.severity] || 0) + 1
        
        // Status breakdown
        stats.byStatus[incident.status] = (stats.byStatus[incident.status] || 0) + 1
        
        // Type breakdown
        stats.byType[incident.incident_type] = (stats.byType[incident.incident_type] || 0) + 1
        
        // State breakdown
        stats.byState[incident.state] = (stats.byState[incident.state] || 0) + 1
        
        // Date breakdown (by month)
        const month = new Date(incident.incident_date).toISOString().slice(0, 7)
        stats.byDate[month] = (stats.byDate[month] || 0) + 1
      })

      return { success: true, data: stats }

    } catch (error) {
      console.error('Get incident statistics error:', error)
      return { success: false, error: error.message }
    }
  }

  // Search incidents
  async searchIncidents(query, filters = {}, limit = 50) {
    try {
      let searchQuery = this.supabase
        .from('incidents')
        .select(`
          *,
          reporter:users!incidents_reporter_id_fkey(
            id,
            full_name
          )
        `)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,address.ilike.%${query}%`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      // Apply additional filters
      if (filters.severity) {
        searchQuery = searchQuery.eq('severity', filters.severity)
      }
      if (filters.status) {
        searchQuery = searchQuery.eq('status', filters.status)
      }
      if (filters.state) {
        searchQuery = searchQuery.eq('state', filters.state)
      }

      const { data, error } = await searchQuery.limit(limit)

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, data }

    } catch (error) {
      console.error('Search incidents error:', error)
      return { success: false, error: error.message }
    }
  }

  // Export incidents data
  async exportIncidents(filters = {}, format = 'json') {
    try {
      const result = await this.getIncidents(filters, 1, 10000) // Get all incidents
      
      if (!result.success) {
        throw new Error(result.error)
      }

      if (format === 'csv') {
        return this.convertToCSV(result.data)
      }

      return JSON.stringify(result.data, null, 2)

    } catch (error) {
      console.error('Export incidents error:', error)
      throw error
    }
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
      inc.state,
      inc.lga,
      inc.latitude,
      inc.longitude,
      inc.reporter?.full_name || 'Anonymous'
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  // Get recent incidents (last 24 hours)
  async getRecentIncidents(limit = 20) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    return this.getIncidentsByDateRange(yesterday.toISOString(), new Date().toISOString(), limit)
  }

  // Get trending locations
  async getTrendingLocations(limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('incidents')
        .select('state, lga, count')
        .eq('is_deleted', false)
        .not('state', 'is', null)
        .group('state, lga')
        .order('count', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, data }

    } catch (error) {
      console.error('Get trending locations error:', error)
      return { success: false, error: error.message }
    }
  }

  // Clear cache
  clearCache() {
    this.incidentCache.clear()
    console.log('Incident cache cleared')
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.incidentCache.size,
      enabled: this.realTimeEnabled,
      subscriptions: this.subscriptions.size
    }
  }
}

// Create singleton instance
const incidentService = new IncidentService()

export default incidentService
