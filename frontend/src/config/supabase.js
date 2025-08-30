import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a mock client if environment variables are missing
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
  console.warn('Supabase environment variables not found. App will run in local mode.')
}

// Helper functions for common operations
export const supabaseHelpers = {
  // Get current user
  getCurrentUser: async () => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // Get current session
  getCurrentSession: async () => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  // Sign out user
  signOut: async () => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Listen to auth changes
  onAuthStateChange: (callback) => {
    if (!supabase) throw new Error('Supabase not initialized')
    return supabase.auth.onAuthStateChange(callback)
  },

  // Upload file to storage
  uploadFile: async (bucket, path, file, options = {}) => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options)
    
    if (error) throw error
    return data
  },

  // Get public URL for file
  getPublicUrl: (bucket, path) => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    return data.publicUrl
  },

  // Delete file from storage
  deleteFile: async (bucket, path) => {
    if (!supabase) throw new Error('Supabase not initialized')
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw error
  },

  // Database operations with RLS
  from: (table) => {
    if (!supabase) throw new Error('Supabase not initialized')
    return supabase.from(table)
  },

  // Real-time subscriptions
  channel: (name, options = {}) => {
    if (!supabase) throw new Error('Supabase not initialized')
    return supabase.channel(name, options)
  }
}

export default supabase
