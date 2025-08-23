const { dbHelpers } = require('../config/supabase')

class DatabaseService {
  constructor() {
    this.supabase = dbHelpers
  }

  // User Profile Operations
  async createUserProfile(userId, profileData) {
    try {
      const { data, error } = await this.supabase.from('user_profiles').insert([{
        id: userId,
        email: profileData.email,
        phone: profileData.phone,
        full_name: profileData.fullName,
        role: 'user',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  }

  async getUserProfile(userId) {
    try {
      const { data, error } = await this.supabase.from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting user profile:', error)
      throw error
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      const { data, error } = await this.supabase.from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  async updateUserRole(userId, role) {
    try {
      const { data, error } = await this.supabase.from('user_profiles')
        .update({
          role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating user role:', error)
      throw error
    }
  }

  async updateUserStatus(userId, status) {
    try {
      const { data, error } = await this.supabase.from('user_profiles')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating user status:', error)
      throw error
    }
  }

  async getAllUsers(filters = {}, pagination = { page: 1, limit: 20 }) {
    try {
      let query = this.supabase.from('user_profiles').select('*')

      // Apply filters
      if (filters.role) {
        query = query.eq('role', filters.role)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      // Apply pagination
      const offset = (pagination.page - 1) * pagination.limit
      query = query.range(offset, offset + pagination.limit - 1)

      const { data, error, count } = await query

      if (error) throw error

      return {
        users: data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count || data.length,
          pages: Math.ceil((count || data.length) / pagination.limit)
        }
      }
    } catch (error) {
      console.error('Error getting all users:', error)
      throw error
    }
  }

  // Incident Operations
  async createIncident(incidentData) {
    try {
      const { data, error } = await this.supabase.from('incidents').insert([{
        ...incidentData,
        status: 'reported',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating incident:', error)
      throw error
    }
  }

  async getIncident(incidentId) {
    try {
      const { data, error } = await this.supabase.from('incidents')
        .select(`
          *,
          user_profiles!inner(full_name, email),
          media_files(*),
          incident_updates(*)
        `)
        .eq('id', incidentId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting incident:', error)
      throw error
    }
  }

  async getAllIncidents(filters = {}, pagination = { page: 1, limit: 20 }) {
    try {
      let query = this.supabase.from('incidents')
        .select(`
          *,
          user_profiles!inner(full_name, email)
        `)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }
      if (filters.incident_type) {
        query = query.eq('incident_type', filters.incident_type)
      }
      if (filters.state) {
        query = query.eq('state', filters.state)
      }
      if (filters.date_range) {
        const days = parseInt(filters.date_range)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        query = query.gte('created_at', cutoffDate.toISOString())
      }

      // Apply pagination
      const offset = (pagination.page - 1) * pagination.limit
      query = query.range(offset, offset + pagination.limit - 1)
        .order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      return {
        incidents: data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: count || data.length,
          pages: Math.ceil((count || data.length) / pagination.limit)
        }
      }
    } catch (error) {
      console.error('Error getting all incidents:', error)
      throw error
    }
  }

  async updateIncident(incidentId, updates) {
    try {
      const { data, error } = await this.supabase.from('incidents')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating incident:', error)
      throw error
    }
  }

  async deleteIncident(incidentId) {
    try {
      const { error } = await this.supabase.from('incidents')
        .delete()
        .eq('id', incidentId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting incident:', error)
      throw error
    }
  }

  async addIncidentUpdate(incidentId, updateData) {
    try {
      const { data, error } = await this.supabase.from('incident_updates').insert([{
        incident_id: incidentId,
        ...updateData,
        created_at: new Date().toISOString()
      }]).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding incident update:', error)
      throw error
    }
  }

  async getNearbyIncidents(latitude, longitude, radius = 5000) {
    try {
      // Use PostGIS function to find nearby incidents
      const { data, error } = await this.supabase.rpc('get_nearby_incidents', {
        lat: latitude,
        lng: longitude,
        radius_meters: radius
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting nearby incidents:', error)
      throw error
    }
  }

  async getUserIncidents(userId) {
    try {
      const { data, error } = await this.supabase.from('incidents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting user incidents:', error)
      throw error
    }
  }

  // Media File Operations
  async createMediaFile(mediaData) {
    try {
      const { data, error } = await this.supabase.from('media_files').insert([{
        ...mediaData,
        created_at: new Date().toISOString()
      }]).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating media file:', error)
      throw error
    }
  }

  async getMediaFile(mediaId) {
    try {
      const { data, error } = await this.supabase.from('media_files')
        .select('*')
        .eq('id', mediaId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting media file:', error)
      throw error
    }
  }

  async deleteMediaFile(mediaId) {
    try {
      const { error } = await this.supabase.from('media_files')
        .delete()
        .eq('id', mediaId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting media file:', error)
      throw error
    }
  }

  // Analytics Operations
  async getDashboardStats() {
    try {
      const [
        totalIncidents,
        pendingIncidents,
        investigatingIncidents,
        resolvedIncidents,
        totalUsers,
        newUsersThisMonth
      ] = await Promise.all([
        this.supabase.from('incidents').select('*', { count: 'exact' }),
        this.supabase.from('incidents').select('*', { count: 'exact' }).eq('status', 'reported'),
        this.supabase.from('incidents').select('*', { count: 'exact' }).eq('status', 'investigating'),
        this.supabase.from('incidents').select('*', { count: 'exact' }).eq('status', 'resolved'),
        this.supabase.from('user_profiles').select('*', { count: 'exact' }),
        this.supabase.from('user_profiles').select('*', { count: 'exact' })
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ])

      // Get incidents by severity
      const incidentsBySeverity = await this.supabase.from('incidents')
        .select('severity')
        .then(({ data }) => {
          const counts = { low: 0, medium: 0, high: 0, critical: 0 }
          data.forEach(incident => {
            counts[incident.severity] = (counts[incident.severity] || 0) + 1
          })
          return counts
        })

      // Get incidents by state
      const incidentsByState = await this.supabase.from('incidents')
        .select('state')
        .then(({ data }) => {
          const counts = {}
          data.forEach(incident => {
            counts[incident.state] = (counts[incident.state] || 0) + 1
          })
          return counts
        })

      return {
        total_incidents: totalIncidents.count || 0,
        pending_incidents: pendingIncidents.count || 0,
        investigating_incidents: investigatingIncidents.count || 0,
        resolved_incidents: resolvedIncidents.count || 0,
        total_users: totalUsers.count || 0,
        new_users_this_month: newUsersThisMonth.count || 0,
        incidents_by_severity: incidentsBySeverity,
        incidents_by_state: incidentsByState
      }
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      throw error
    }
  }

  async getSystemStats() {
    try {
      const [
        totalUsers,
        totalIncidents,
        storageStats
      ] = await Promise.all([
        this.supabase.from('user_profiles').select('*', { count: 'exact' }),
        this.supabase.from('incidents').select('*', { count: 'exact' }),
        this.supabase.storage.list('incident-media')
      ])

      // Calculate storage usage
      let totalSize = 0
      if (storageStats) {
        storageStats.forEach(file => {
          totalSize += file.metadata?.size || 0
        })
      }

      return {
        system_health: 'healthy',
        total_users: totalUsers.count || 0,
        total_incidents: totalIncidents.count || 0,
        storage_used: `${(totalSize / (1024 * 1024 * 1024)).toFixed(2)}GB`,
        storage_limit: '10GB',
        uptime: '99.9%',
        last_backup: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting system stats:', error)
      throw error
    }
  }

  // State and LGA Operations
  async getStates() {
    try {
      const { data, error } = await this.supabase.from('states')
        .select('*')
        .order('name')

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting states:', error)
      throw error
    }
  }

  async getLGAs(stateId = null) {
    try {
      let query = this.supabase.from('lgas').select('*')
      
      if (stateId) {
        query = query.eq('state_id', stateId)
      }
      
      const { data, error } = await query.order('name')

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting LGAs:', error)
      throw error
    }
  }

  // Announcement Operations
  async createAnnouncement(announcementData) {
    try {
      const { data, error } = await this.supabase.from('announcements').insert([{
        ...announcementData,
        created_at: new Date().toISOString()
      }]).select().single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating announcement:', error)
      throw error
    }
  }

  async getAnnouncements() {
    try {
      const { data, error } = await this.supabase.from('announcements')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting announcements:', error)
      throw error
    }
  }

  async updateAnnouncement(announcementId, updates) {
    try {
      const { data, error } = await this.supabase.from('announcements')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', announcementId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating announcement:', error)
      throw error
    }
  }

  async deleteAnnouncement(announcementId) {
    try {
      const { error } = await this.supabase.from('announcements')
        .delete()
        .eq('id', announcementId)

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error deleting announcement:', error)
      throw error
    }
  }

  // App Settings Operations
  async getAppSettings() {
    try {
      const { data, error } = await this.supabase.from('app_settings')
        .select('*')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting app settings:', error)
      throw error
    }
  }

  async updateAppSettings(updates) {
    try {
      const { data, error } = await this.supabase.from('app_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating app settings:', error)
      throw error
    }
  }

  // Maintenance Mode Operations
  async getMaintenanceMode() {
    try {
      const { data, error } = await this.supabase.from('maintenance_mode')
        .select('*')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting maintenance mode:', error)
      throw error
    }
  }

  async toggleMaintenanceMode(enabled, message = '') {
    try {
      const { data, error } = await this.supabase.from('maintenance_mode')
        .update({
          enabled,
          message,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error toggling maintenance mode:', error)
      throw error
    }
  }
}

module.exports = new DatabaseService()
