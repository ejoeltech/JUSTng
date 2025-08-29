import { supabase } from '../config/supabase'

// API service with JWT authentication
class ApiService {
  constructor() {
    this.baseURL = '/api' // Will be set to Vercel Functions URL after deployment
    console.log('API Service initialized')
  }

  // Get auth token from localStorage
  getAuthToken() {
    try {
      const user = JSON.parse(localStorage.getItem('just_user') || '{}')
      return user.accessToken || null
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  // Generic request method with JWT authentication
  async request(endpoint, options = {}) {
    const token = this.getAuthToken()
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    const fullUrl = `${this.baseURL}${endpoint}`
    console.log(`Making API request to: ${fullUrl}`)

    try {
      const response = await fetch(fullUrl, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle authentication errors
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('just_user')
          localStorage.removeItem('just_user_role')
          window.location.href = '/login'
          throw new Error('Authentication expired. Please log in again.')
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error)
      throw error
    }
  }

  // Authentication endpoints (consolidated)
  auth = {
    register: (userData) => this.request('/auth?action=register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

    login: (credentials) => this.request('/auth?action=login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

    resetPassword: (email) => this.request('/auth?action=reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

    verifyEmail: (verificationData) => this.request('/auth?action=verify-email', {
      method: 'POST',
      body: JSON.stringify(verificationData)
    }),

    resendVerification: (emailData) => this.request('/auth?action=resend-verification', {
      method: 'POST',
      body: JSON.stringify(emailData)
    }),

    verifyToken: () => this.request('/auth?action=verify')
  }

  // Incidents endpoints with JWT authentication
  incidents = {
    getAll: (params = {}) => {
      const queryString = new URLSearchParams(params).toString()
      return this.request(`/incidents${queryString ? `?${queryString}` : ''}`)
    },
    
    getById: (id) => this.request(`/incidents/${id}`),
    
    create: (incidentData) => this.request('/incidents', {
      method: 'POST',
      body: JSON.stringify(incidentData)
    }),
    
    update: (id, updateData) => this.request(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    }),
    
    delete: (id) => this.request(`/incidents/${id}`, {
      method: 'DELETE'
    }),
    
    uploadEvidence: (fileData) => this.request('/incidents/upload', {
      method: 'POST',
      body: JSON.stringify(fileData)
    })
  }

  // Users endpoints
  users = {
    getProfile: () => this.request('/users/profile'),
    
    updateProfile: (profileData) => this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),
    
    changePassword: (passwordData) => this.request('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    }),

    getStats: (timeframe = '30') => this.request(`/users/stats?timeframe=${timeframe}`)
  }

  // Admin endpoints (consolidated)
  admin = {
    getUsers: (params = {}) => {
      const queryString = new URLSearchParams(params).toString()
      return this.request(`/admin?action=users${queryString ? `&${queryString}` : ''}`)
    },
    
    updateUser: (userId, userData) => this.request(`/admin?action=user-role`, {
      method: 'PUT',
      body: JSON.stringify({ userId, newRole: userData.role })
    }),
    
    deleteUser: (userId) => this.request(`/admin?action=user&userId=${userId}`, {
      method: 'DELETE'
    }),
    
    getIncidents: (params = {}) => {
      const queryString = new URLSearchParams(params).toString()
      return this.request(`/admin/incidents${queryString ? `?${queryString}` : ''}`)
    },
    
    updateIncident: (incidentId, incidentData) => this.request(`/admin/incidents/${incidentId}`, {
      method: 'PUT',
      body: JSON.stringify(incidentData)
    }),
    
    getAnalytics: () => this.request('/admin?action=analytics'),
    
    getSystemHealth: () => this.request('/admin?action=health'),
    
    // Additional admin functions
    createInviteCode: (inviteData) => this.request('/admin?action=invite-codes', {
      method: 'POST',
      body: JSON.stringify(inviteData)
    }),
    
    updateUserStatus: (userId, newStatus) => this.request('/admin?action=user-status', {
      method: 'PUT',
      body: JSON.stringify({ userId, newStatus })
    }),
    
    deleteInviteCode: (inviteCode) => this.request(`/admin?action=invite-code&inviteCode=${inviteCode}`, {
      method: 'DELETE'
    })
  }

  // SuperAdmin endpoints
  superAdmin = {
    getSystemStats: () => this.request('/super-admin/stats'),
    
    getUsers: (params = {}) => {
      const queryString = new URLSearchParams(params).toString()
      return this.request(`/super-admin/users${queryString ? `?${queryString}` : ''}`)
    },
    
    updateUserRole: (userId, roleData) => this.request(`/super-admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify(roleData)
    }),
    
    getSystemLogs: (params = {}) => {
      const queryString = new URLSearchParams(params).toString()
      return this.request(`/super-admin/logs${queryString ? `?${queryString}` : ''}`)
    },
    
    createAnnouncement: (announcementData) => this.request('/super-admin/announcements', {
      method: 'POST',
      body: JSON.stringify(announcementData)
    }),
    
    getAnnouncements: () => this.request('/super-admin/announcements'),
    
    updateAnnouncement: (announcementId, announcementData) => this.request(`/super-admin/announcements/${announcementId}`, {
      method: 'PUT',
      body: JSON.stringify(announcementData)
    }),
    
    deleteAnnouncement: (announcementId) => this.request(`/super-admin/announcements/${announcementId}`, {
      method: 'DELETE'
    })
  }

  // Utility methods
  utils = {
    // Check if user is authenticated
    isAuthenticated: () => {
      const token = this.getAuthToken()
      return !!token
    },

    // Get user role
    getUserRole: () => {
      try {
        const user = JSON.parse(localStorage.getItem('just_user') || '{}')
        return user.role || null
      } catch (error) {
        return null
      }
    },

    // Check if user has specific role
    hasRole: (role) => {
      const userRole = this.getUserRole()
      return userRole === role
    },

    // Check if user has any of the specified roles
    hasAnyRole: (roles) => {
      const userRole = this.getUserRole()
      return roles.includes(userRole)
    },

    // Logout user
    logout: () => {
      localStorage.removeItem('just_user')
      localStorage.removeItem('just_user_role')
      window.location.href = '/'
    }
  }
}

const apiService = new ApiService()
export default apiService
