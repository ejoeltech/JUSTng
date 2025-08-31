// Supabase Database Service Layer
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://tuhsvbzbbftaxdfqvxds.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1aHN2YnpiYmZ0YXhkZnF2eGRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImiYXQiOjE3NTU5ODgyNTEsImV4cCI6MjA3MTU2NDI1MX0._AHK2ngkEQsM8Td2rHqZkjVLn9MMCsk7F1UK9u6JXgA'

const supabase = createClient(supabaseUrl, supabaseKey)

// Database service class
class DatabaseService {
  constructor() {
    this.supabase = supabase
  }

  // ===== USER MANAGEMENT =====
  
  async createUser(userData) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .insert([{
          id: userData.id,
          email: userData.email,
          full_name: userData.fullName,
          phone: userData.phone,
          organization: userData.organization,
          role: userData.role,
          status: userData.status,
          email_verified: userData.emailVerified,
          verification_token: userData.verificationToken,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Create user error:', error)
      return { data: null, error }
    }
  }

  async getUserById(userId) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Get user error:', error)
      return { data: null, error }
    }
  }

  async getUserByEmail(email) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Get user by email error:', error)
      return { data: null, error }
    }
  }

  async updateUser(userId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Update user error:', error)
      return { data: null, error }
    }
  }

  async verifyUserEmail(userId, verificationToken) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({
          status: 'active',
          email_verified: true,
          verification_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .eq('verification_token', verificationToken)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Verify email error:', error)
      return { data: null, error }
    }
  }

  // ===== INCIDENT MANAGEMENT =====

  async createIncident(incidentData) {
    try {
      const { data, error } = await this.supabase
        .from('incidents')
        .insert([{
          id: incidentData.id,
          title: incidentData.title,
          description: incidentData.description,
          location: incidentData.location,
          status: incidentData.status,
          severity: incidentData.severity,
          category: incidentData.category,
          reporter_id: incidentData.reporterId,
          reporter_name: incidentData.reporterName,
          evidence: incidentData.evidence || [],
          assigned_to: incidentData.assignedTo,
          priority: incidentData.priority,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Create incident error:', error)
      return { data: null, error }
    }
  }

  async getIncidents(filters = {}, userRole, userId) {
    try {
      let query = this.supabase
        .from('incidents')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply role-based filtering
      if (userRole === 'user') {
        query = query.eq('reporter_id', userId)
      } else if (userRole === 'police') {
        query = query.or(`status.eq.reported,assigned_to.eq.${userId}`)
      }
      // Admin and SuperAdmin can see all incidents

      // Apply additional filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }
      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      if (filters.location) {
        // Simple text search - in production, use PostGIS for geospatial queries
        query = query.ilike('location->>address', `%${filters.location}%`)
      }

      // Apply pagination
      const page = filters.page || 1
      const limit = filters.limit || 10
      const start = (page - 1) * limit
      const end = start + limit - 1

      query = query.range(start, end)

      const { data, error, count } = await query

      if (error) throw error

      // Get total count for pagination
      const { count: totalCount } = await this.supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })

      return { 
        data, 
        error: null, 
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalIncidents: totalCount,
          hasNextPage: end < totalCount,
          hasPrevPage: page > 1
        }
      }
    } catch (error) {
      console.error('Get incidents error:', error)
      return { data: null, error, pagination: null }
    }
  }

  async getIncidentById(incidentId) {
    try {
      const { data, error } = await this.supabase
        .from('incidents')
        .select('*')
        .eq('id', incidentId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Get incident error:', error)
      return { data: null, error }
    }
  }

  async updateIncident(incidentId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('incidents')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Update incident error:', error)
      return { data: null, error }
    }
  }

  // ===== FILE MANAGEMENT =====

  async uploadFile(file, incidentId, userId) {
    try {
      const fileName = `${incidentId}/${Date.now()}_${file.name}`
      const filePath = `evidence/${fileName}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('evidence')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('evidence')
        .getPublicUrl(filePath)

      // Store file metadata in database
      const fileMetadata = {
        id: `file-${Date.now()}`,
        incident_id: incidentId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: userId,
        url: urlData.publicUrl,
        created_at: new Date().toISOString()
      }

      const { data: dbData, error: dbError } = await this.supabase
        .from('files')
        .insert([fileMetadata])
        .select()
        .single()

      if (dbError) throw dbError

      return { data: dbData, error: null }
    } catch (error) {
      console.error('File upload error:', error)
      return { data: null, error }
    }
  }

  async getIncidentFiles(incidentId) {
    try {
      const { data, error } = await this.supabase
        .from('files')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Get incident files error:', error)
      return { data: null, error }
    }
  }

  // ===== ANALYTICS & STATISTICS =====

  async getIncidentStats(userRole, userId) {
    try {
      let query = this.supabase
        .from('incidents')
        .select('status, severity, category, created_at')

      // Apply role-based filtering
      if (userRole === 'user') {
        query = query.eq('reporter_id', userId)
      } else if (userRole === 'police') {
        query = query.or(`status.eq.reported,assigned_to.eq.${userId}`)
      }

      const { data, error } = await query

      if (error) throw error

      // Calculate statistics
      const stats = {
        total: data.length,
        byStatus: {},
        bySeverity: {},
        byCategory: {},
        recent: data.filter(incident => {
          const incidentDate = new Date(incident.created_at)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          return incidentDate > thirtyDaysAgo
        }).length
      }

      // Group by status, severity, and category
      data.forEach(incident => {
        stats.byStatus[incident.status] = (stats.byStatus[incident.status] || 0) + 1
        stats.bySeverity[incident.severity] = (stats.bySeverity[incident.severity] || 0) + 1
        stats.byCategory[incident.category] = (stats.byCategory[incident.category] || 0) + 1
      })

      return { data: stats, error: null }
    } catch (error) {
      console.error('Get incident stats error:', error)
      return { data: null, error }
    }
  }

  async getUserStats(userId) {
    try {
      const { data, error } = await this.supabase
        .from('incidents')
        .select('status, created_at')
        .eq('reporter_id', userId)

      if (error) throw error

      const stats = {
        totalIncidents: data.length,
        activeIncidents: data.filter(incident => 
          ['reported', 'investigating', 'under_review'].includes(incident.status)
        ).length,
        resolvedIncidents: data.filter(incident => 
          ['resolved', 'closed'].includes(incident.status)
        ).length,
        recentActivity: data.filter(incident => {
          const incidentDate = new Date(incident.created_at)
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          return incidentDate > sevenDaysAgo
        }).length
      }

      return { data: stats, error: null }
    } catch (error) {
      console.error('Get user stats error:', error)
      return { data: null, error }
    }
  }

  // ===== ADMIN FUNCTIONS =====

  async getAllUsers(filters = {}) {
    try {
      let query = this.supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters.role) {
        query = query.eq('role', filters.role)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.search) {
        query = query.or(`email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Get all users error:', error)
      return { data: null, error }
    }
  }

  async updateUserRole(userId, newRole) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Update user role error:', error)
      return { data: null, error }
    }
  }

  // ===== UTILITY FUNCTIONS =====

  async healthCheck() {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('count', { count: 'exact', head: true })

      if (error) throw error
      return { data: { status: 'healthy', timestamp: new Date().toISOString() }, error: null }
    } catch (error) {
      console.error('Health check error:', error)
      return { data: { status: 'unhealthy', error: error.message }, error }
    }
  }

  async cleanup() {
    try {
      // Close Supabase connection
      await this.supabase.auth.signOut()
      return { data: { message: 'Connection closed' }, error: null }
    } catch (error) {
      console.error('Cleanup error:', error)
      return { data: null, error }
    }
  }

  // ===== TESTING FUNCTIONS =====
  
  async testConnection() {
    try {
      // Test basic connection by trying to access a table
      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (error) {
        // If users table doesn't exist, try a different approach
        const { data: testData, error: testError } = await this.supabase
          .rpc('version')
        
        if (testError) {
          return { error: 'Database connection failed', details: testError }
        }
        
        return { 
          success: true, 
          message: 'Database connected but tables may not exist',
          version: testData
        }
      }
      
      return { 
        success: true, 
        message: 'Database connection successful',
        tableAccess: true
      }
    } catch (error) {
      return { error: 'Connection test failed', details: error.message }
    }
  }

  async checkTables() {
    try {
      const tables = ['users', 'incidents', 'files']
      const results = {}
      
      for (const table of tables) {
        try {
          const { data, error } = await this.supabase
            .from(table)
            .select('count')
            .limit(1)
          
          results[table] = {
            exists: !error,
            error: error ? error.message : null
          }
        } catch (err) {
          results[table] = {
            exists: false,
            error: err.message
          }
        }
      }
      
      return results
    } catch (error) {
      return { error: 'Table check failed', details: error.message }
    }
  }
}

// Export singleton instance
const databaseService = new DatabaseService()
export default databaseService
