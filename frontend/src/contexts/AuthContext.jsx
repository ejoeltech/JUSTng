import { createContext, useContext, useEffect, useState } from 'react'
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
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    // Check if user is logged in from localStorage
    const checkAuthState = () => {
      const savedUser = localStorage.getItem('just_user')
      const savedRole = localStorage.getItem('just_user_role')
      
      if (savedUser && savedRole) {
        try {
          const userData = JSON.parse(savedUser)
          setUser(userData)
          setUserRole(savedRole)
        } catch (error) {
          console.error('Error parsing saved user data:', error)
          localStorage.removeItem('just_user')
          localStorage.removeItem('just_user_role')
        }
      }
    }

    checkAuthState()
  }, [])

  const signUp = async (email, password, phone, fullName, inviteCode) => {
    try {
      setLoading(true)
      // Use API service for registration
      const result = await apiService.auth.register({
        email,
        password,
        phone,
        fullName,
        inviteCode
      })

      if (result.user) {
        // Store user data locally for now (in production, this would be JWT)
        const userData = {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
          status: result.user.status
        }
        
        localStorage.setItem('just_user', JSON.stringify(userData))
        localStorage.setItem('just_user_role', result.user.role)
        
        setUser(userData)
        setUserRole(result.user.role)
      }

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      // Use API service for login
      const result = await apiService.auth.login({
        email,
        password
      })

      if (result.user) {
        // Store user data locally for now (in production, this would be JWT)
        const userData = {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
          status: result.user.status
        }
        
        localStorage.setItem('just_user', JSON.stringify(userData))
        localStorage.setItem('just_user_role', result.user.role)
        
        setUser(userData)
        setUserRole(result.user.role)
      }

      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('just_user')
      localStorage.removeItem('just_user_role')
      
      // Clear state
      setUser(null)
      setUserRole(null)
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
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
