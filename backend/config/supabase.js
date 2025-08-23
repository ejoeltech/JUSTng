const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database helper functions
const dbHelpers = {
  // Execute raw SQL queries
  async executeSQL(sql, params = []) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: sql,
        sql_params: params
      })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('SQL execution error:', error)
      throw error
    }
  },

  // Get table data with RLS
  async from(table) {
    return supabase.from(table)
  },

  // Storage operations
  storage: {
    // Upload file to storage
    async upload(bucket, path, file, options = {}) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(path, file, options)
        
        if (error) throw error
        return data
      } catch (error) {
        console.error('Storage upload error:', error)
        throw error
      }
    },

    // Get public URL for file
    getPublicUrl(bucket, path) {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)
      return data.publicUrl
    },

    // Delete file from storage
    async remove(bucket, paths) {
      try {
        const { error } = await supabase.storage
          .from(bucket)
          .remove(paths)
        
        if (error) throw error
        return true
      } catch (error) {
        console.error('Storage remove error:', error)
        throw error
      }
    },

    // List files in bucket
    async list(bucket, path = '', options = {}) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .list(path, options)
        
        if (error) throw error
        return data
      } catch (error) {
        console.error('Storage list error:', error)
        throw error
      }
    }
  },

  // Auth operations
  auth: {
    // Get user by ID
    async getUserById(userId) {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(userId)
        if (error) throw error
        return data.user
      } catch (error) {
        console.error('Auth getUserById error:', error)
        throw error
      }
    },

    // Create user
    async createUser(userData) {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userData.fullName,
            phone: userData.phone
          }
        })
        
        if (error) throw error
        return data.user
      } catch (error) {
        console.error('Auth createUser error:', error)
        throw error
      }
    },

    // Update user
    async updateUser(userId, updates) {
      try {
        const { data, error } = await supabase.auth.admin.updateUserById(userId, updates)
        if (error) throw error
        return data.user
      } catch (error) {
        console.error('Auth updateUser error:', error)
        throw error
      }
    },

    // Delete user
    async deleteUser(userId) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(userId)
        if (error) throw error
        return true
      } catch (error) {
        console.error('Auth deleteUser error:', error)
        throw error
      }
    }
  },

  // Real-time subscriptions
  realtime: {
    // Subscribe to table changes
    channel(name, options = {}) {
      return supabase.channel(name, options)
    },

    // Broadcast message to channel
    async broadcast(channel, event, payload) {
      try {
        const { error } = await supabase.channel(channel).send({
          type: 'broadcast',
          event,
          payload
        })
        
        if (error) throw error
        return true
      } catch (error) {
        console.error('Realtime broadcast error:', error)
        throw error
      }
    }
  }
}

module.exports = { supabase, dbHelpers }
