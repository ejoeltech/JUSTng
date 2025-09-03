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
    // Check if user is logged in from localStorage and validate token
    const checkAuthState = async () => {
      const savedUser = localStorage.getItem('just_user')
      const savedRole = localStorage.getItem('just_user_role')
      
      if (savedUser && savedRole) {
        try {
          const userData = JSON.parse(savedUser)
          
          // Check if token is still valid
          if (userData.accessToken) {
            // Validate token with server
            try {
              const response = await apiService.auth.verifyToken()
              if (response.success && response.data.valid) {
                setUser(userData)
                setUserRole(savedRole)
                setIsAuthenticated(true)
              } else {
                // Token invalid, clear auth state
                clearAuthState()
              }
            } catch (error) {
              // Token validation failed, clear auth state
              console.error('Token validation failed:', error)
              clearAuthState()
            }
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

      if (result.success && result.data.user) {
        // Store user data locally with JWT token
        const userData = {
          id: result.data.user.id,
          email: result.data.user.email,
          fullName: result.data.user.fullName,
          role: result.data.user.role,
          status: result.data.user.status,
          accessToken: result.data.accessToken,
          tokenType: result.data.tokenType,
          expiresIn: result.data.expiresIn
        }
        
        localStorage.setItem('just_user', JSON.stringify(userData))
        localStorage.setItem('just_user_role', result.data.user.role)
        
        setUser(userData)
        setUserRole(result.data.user.role)
        setIsAuthenticated(true)
        
        return { data: result.data, error: null }
      } else {
        return { data: null, error: new Error(result.error?.message || 'Registration failed') }
      }
    } catch (error) {
      console.error('Sign up error:', error)
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

      if (result.success && result.data.user) {
        // Store user data locally with JWT token
        const userData = {
          id: result.data.user.id,
          email: result.data.user.email,
          fullName: result.data.user.fullName,
          role: result.data.user.role,
          status: result.data.user.status,
          accessToken: result.data.accessToken,
          tokenType: result.data.tokenType,
          expiresIn: result.data.expiresIn
        }
        
        localStorage.setItem('just_user', JSON.stringify(userData))
        localStorage.setItem('just_user_role', result.data.user.role)
        
        setUser(userData)
        setUserRole(result.data.user.role)
        setIsAuthenticated(true)
        
        return { data: result.data, error: null }
      } else {
        return { data: null, error: new Error(result.error?.message || 'Login failed') }
      }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      // Call logout API
      await apiService.auth.logout()
    } catch (error) {
      console.error('Error calling logout API:', error)
    } finally {
      // Always clear local state
      clearAuthState()
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
