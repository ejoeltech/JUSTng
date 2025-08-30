import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a dummy client or null if environment variables are missing
let supabase = null

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
} else {
  console.warn('Supabase environment variables not found. Some features will be disabled.')
  // Create a mock client for development
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: () => Promise.resolve({ error: null })
      })
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
    }),
    channel: () => ({
      on: () => ({}),
      subscribe: () => Promise.resolve()
    })
  }
}

export { supabase }

// Helper functions for common operations
export const supabaseHelpers = {
  // Get current user
  getCurrentUser: async () => {
    if (!supabase || !supabaseUrl) return null
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // Get current session
  getCurrentSession: async () => {
    if (!supabase || !supabaseUrl) return null
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  // Sign out user
  signOut: async () => {
    if (!supabase || !supabaseUrl) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Listen to auth changes
  onAuthStateChange: (callback) => {
    if (!supabase || !supabaseUrl) return { data: { subscription: { unsubscribe: () => {} } } }
    return supabase.auth.onAuthStateChange(callback)
  },

  // Upload file to storage
  uploadFile: async (bucket, path, file, options = {}) => {
    if (!supabase || !supabaseUrl) throw new Error('Supabase not configured')
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options)
    
    if (error) throw error
    return data
  },

  // Get public URL for file
  getPublicUrl: (bucket, path) => {
    if (!supabase || !supabaseUrl) return ''
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    return data.publicUrl
  },

  // Delete file from storage
  deleteFile: async (bucket, path) => {
    if (!supabase || !supabaseUrl) return
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw error
  },

  // Database operations with RLS
  from: (table) => {
    if (!supabase || !supabaseUrl) return {
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
    }
    return supabase.from(table)
  },

  // Real-time subscriptions
  channel: (name, options = {}) => {
    if (!supabase || !supabaseUrl) return {
      on: () => ({}),
      subscribe: () => Promise.resolve()
    }
    return supabase.channel(name, options)
  }
}

export default supabase
