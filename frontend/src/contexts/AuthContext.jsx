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
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check if user is logged in from localStorage
    const checkAuthState = () => {
      const savedUser = localStorage.getItem('just_user')
      const savedRole = localStorage.getItem('just_user_role')
      
      if (savedUser && savedRole) {
        try {
          const userData = JSON.parse(savedUser)
          
          // Check if token is still valid (basic check)
          if (userData.accessToken) {
            setUser(userData)
            setUserRole(savedRole)
            setIsAuthenticated(true)
          } else {
            // No valid token, clear auth state
            clearAuthState()
          }
        } catch (error) {
          console.error('Error parsing saved user data:', error)
          clearAuthState()
        }
      }
    }

    checkAuthState()
  }, [])

  const clearAuthState = () => {
    localStorage.removeItem('just_user')
    localStorage.removeItem('just_user_role')
    setUser(null)
    setUserRole(null)
    setIsAuthenticated(false)
  }

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
        // Store user data locally with JWT token
        const userData = {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
          status: result.user.status,
          accessToken: result.accessToken,
          tokenType: result.tokenType,
          expiresIn: result.expiresIn
        }
        
        localStorage.setItem('just_user', JSON.stringify(userData))
        localStorage.setItem('just_user_role', result.user.role)
        
        setUser(userData)
        setUserRole(result.user.role)
        setIsAuthenticated(true)
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
        // Store user data locally with JWT token
        const userData = {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
          status: result.user.status,
          accessToken: result.accessToken,
          tokenType: result.tokenType,
          expiresIn: result.expiresIn
        }
        
        localStorage.setItem('just_user', JSON.stringify(userData))
        localStorage.setItem('just_user_role', result.user.role)
        
        setUser(userData)
        setUserRole(result.user.role)
        setIsAuthenticated(true)
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
      clearAuthState()
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

  const verifyEmail = async (email, verificationToken) => {
    try {
      const result = await apiService.auth.verifyEmail({ email, verificationToken })
      
      if (result.user) {
        // Update user status if verification successful
        const currentUser = JSON.parse(localStorage.getItem('just_user') || '{}')
        if (currentUser.email === email) {
          const updatedUser = { ...currentUser, status: 'active', emailVerified: true }
          localStorage.setItem('just_user', JSON.stringify(updatedUser))
          setUser(updatedUser)
        }
      }
      
      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const resendVerification = async (email) => {
    try {
      const result = await apiService.auth.resendVerification({ email })
      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Check if user has specific role
  const hasRole = (role) => {
    return userRole === role
  }

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(userRole)
  }

  // Check if user can access admin features
  const canAccessAdmin = () => {
    return hasAnyRole(['admin', 'superAdmin'])
  }

  // Check if user can access super admin features
  const canAccessSuperAdmin = () => {
    return hasRole('superAdmin')
  }

  const value = {
    user,
    userRole,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    resetPassword,
    verifyEmail,
    resendVerification,
    hasRole,
    hasAnyRole,
    canAccessAdmin,
    canAccessSuperAdmin,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
