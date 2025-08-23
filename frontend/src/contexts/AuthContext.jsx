import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseHelpers } from '../config/supabase'
import apiService from '../services/api'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchUserRole(session.user.id)
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await fetchUserRole(session.user.id)
        } else {
          setUser(null)
          setUserRole(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (userId) => {
    try {
      // Use API service to get user profile
      const profile = await apiService.users.getProfile()
      if (profile && profile.role) {
        setUserRole(profile.role)
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  const signUp = async (email, password, phone, fullName) => {
    try {
      // Use API service for registration
      const result = await apiService.auth.register({
        email,
        password,
        phone,
        fullName
      })

      if (result.user) {
        // Fetch user role after successful registration
        await fetchUserRole(result.user.id)
      }

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      // Use API service for login
      const result = await apiService.auth.login({
        email,
        password
      })

      if (result.user) {
        // Fetch user role after successful login
        await fetchUserRole(result.user.id)
      }

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const resetPassword = async (email) => {
    try {
      // Use API service for password reset
      await apiService.auth.resetPassword({ email })
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    userRole,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    supabase,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
