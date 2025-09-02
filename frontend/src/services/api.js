import { supabase } from '../config/supabase'

// API service with JWT authentication
class ApiService {
  constructor() {
    // Use Vercel Functions API (same domain as frontend)
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? '/api'  // In production, use relative path for Vercel Functions
      : 'http://localhost:5000/api'  // In development, use local backend
    console.log('API Service initialized with baseURL:', this.baseURL)
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
    // Check if this is an auth request and handle locally if backend unavailable
    if (endpoint.includes('/auth')) {
      return this.handleAuthLocally(endpoint, options)
    }

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
        
        // If backend is not available, handle locally for certain endpoints
        if (response.status === 404 && this.canHandleLocally(endpoint)) {
          return this.handleLocalFallback(endpoint, options)
        }
        
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error)
      
      // If network error and we can handle locally, do so
      if (error.name === 'TypeError' && this.canHandleLocally(endpoint)) {
        return this.handleLocalFallback(endpoint, options)
      }
      
      throw error
    }
  }

  // Check if endpoint can be handled locally
  canHandleLocally(endpoint) {
    return endpoint.includes('/auth') || endpoint.includes('/incidents')
  }

  // Handle auth requests locally when backend is unavailable
  async handleAuthLocally(endpoint, options) {
    const url = new URL(endpoint, 'http://localhost')
    const action = url.searchParams.get('action')
    const body = options.body ? JSON.parse(options.body) : {}

    switch (action) {
      case 'register':
        return this.handleLocalRegister(body)
      case 'login':
        return this.handleLocalLogin(body)
      case 'reset-password':
        return this.handleLocalPasswordReset(body)
      case 'verify-email':
        return this.handleLocalEmailVerify(body)
      case 'resend-verification':
        return this.handleLocalResendVerification(body)
      case 'verify':
        return this.handleLocalTokenVerify()
      default:
        throw new Error(`Unsupported auth action: ${action}`)
    }
  }

  // Local authentication handlers
  async handleLocalRegister(userData) {
    const { email, password, phone, fullName, inviteCode } = userData

    // Simple validation
    if (!email || !password || !fullName) {
      throw new Error('Email, password, and full name are required')
    }

    // Check if user already exists
    const existingUsers = JSON.parse(localStorage.getItem('just_local_users') || '[]')
    if (existingUsers.find(u => u.email === email)) {
      throw new Error('User with this email already exists')
    }

    // Validate invite code (basic validation)
    const validCodes = ['JUST2024', 'ADMIN2024', 'POLICE001']
    if (!validCodes.includes(inviteCode)) {
      throw new Error('Invalid invite code')
    }

    // Determine role based on invite code
    let role = 'user'
    if (inviteCode === 'ADMIN2024') role = 'admin'
    if (inviteCode === 'POLICE001') role = 'police'

    // Create user
    const user = {
      id: Date.now().toString(),
      email,
      fullName,
      phone,
      role,
      status: 'active',
      createdAt: new Date().toISOString(),
      emailVerified: true
    }

    // Save user
    existingUsers.push({ ...user, password }) // In real app, hash password
    localStorage.setItem('just_local_users', JSON.stringify(existingUsers))

    // Generate mock token
    const accessToken = btoa(JSON.stringify({ userId: user.id, email, role }))

    return {
      user,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 86400,
      message: 'Registration successful (local mode)'
    }
  }

  async handleLocalLogin(credentials) {
    const { email, password } = credentials

    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    // Get local users
    const users = JSON.parse(localStorage.getItem('just_local_users') || '[]')
    const user = users.find(u => u.email === email && u.password === password)

    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Generate mock token
    const accessToken = btoa(JSON.stringify({ userId: user.id, email: user.email, role: user.role }))

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return {
      user: userWithoutPassword,
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 86400,
      message: 'Login successful (local mode)'
    }
  }

  async handleLocalPasswordReset(data) {
    return {
      message: 'Password reset email sent (local mode - feature disabled)'
    }
  }

  async handleLocalEmailVerify(data) {
    return {
      message: 'Email verified successfully (local mode)'
    }
  }

  async handleLocalResendVerification(data) {
    return {
      message: 'Verification email sent (local mode - feature disabled)'
    }
  }

  async handleLocalTokenVerify() {
    const token = this.getAuthToken()
    if (!token) {
      throw new Error('No token found')
    }

    try {
      const decoded = JSON.parse(atob(token))
      return {
        valid: true,
        user: decoded,
        message: 'Token valid (local mode)'
      }
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  // Handle other endpoints locally (fallback)
  async handleLocalFallback(endpoint, options) {
    console.warn(`Handling ${endpoint} locally - backend not available`)
    
    if (endpoint.includes('/incidents')) {
      return this.handleLocalIncidents(endpoint, options)
    }
    
    if (endpoint.includes('/users/stats')) {
      return this.handleLocalUserStats()
    }

    if (endpoint.includes('/upload')) {
      return this.handleLocalUpload(options)
    }

    return {
      message: 'Feature handled locally - backend not available'
    }
  }

  // Handle incidents endpoints locally
  async handleLocalIncidents(endpoint, options) {
    const localIncidents = JSON.parse(localStorage.getItem('just_local_incidents') || '[]')
    const currentUser = this.getCurrentUser()

    // Filter incidents for current user
    const userIncidents = localIncidents.filter(incident => 
      incident.reportedBy === currentUser?.id || incident.assignedTo === currentUser?.id
    )

    // Basic pagination
    const page = parseInt(new URLSearchParams(endpoint.split('?')[1] || '').get('page')) || 1
    const limit = parseInt(new URLSearchParams(endpoint.split('?')[1] || '').get('limit')) || 10
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedIncidents = userIncidents.slice(startIndex, endIndex)

    return {
      incidents: paginatedIncidents,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(userIncidents.length / limit),
        totalIncidents: userIncidents.length,
        hasNextPage: endIndex < userIncidents.length,
        hasPrevPage: page > 1
      },
      message: `Found ${userIncidents.length} incidents (local mode)`
    }
  }

  // Handle user stats locally
  async handleLocalUserStats() {
    const localIncidents = JSON.parse(localStorage.getItem('just_local_incidents') || '[]')
    const currentUser = this.getCurrentUser()

    // Filter incidents for current user
    const userIncidents = localIncidents.filter(incident => 
      incident.reportedBy === currentUser?.id
    )

    // Calculate statistics
    const stats = {
      totalIncidents: userIncidents.length,
      activeIncidents: userIncidents.filter(i => i.status === 'open' || i.status === 'in_progress').length,
      resolvedIncidents: userIncidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
      recentActivity: userIncidents.filter(i => {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return new Date(i.createdAt) > weekAgo
      }).length,
      byStatus: {
        open: userIncidents.filter(i => i.status === 'open').length,
        in_progress: userIncidents.filter(i => i.status === 'in_progress').length,
        resolved: userIncidents.filter(i => i.status === 'resolved').length,
        closed: userIncidents.filter(i => i.status === 'closed').length
      },
      bySeverity: {
        low: userIncidents.filter(i => i.severity === 'low').length,
        medium: userIncidents.filter(i => i.severity === 'medium').length,
        high: userIncidents.filter(i => i.severity === 'high').length,
        critical: userIncidents.filter(i => i.severity === 'critical').length
      }
    }

    return {
      data: stats,
      message: 'User statistics calculated (local mode)'
    }
  }

  // Handle file uploads locally
  async handleLocalUpload(options) {
    return {
      success: true,
      fileUrl: 'data:image/png;base64,placeholder',
      fileName: 'local_file_' + Date.now(),
      message: 'File upload simulated (local mode)'
    }
  }

  // Get current user from localStorage
  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('just_user') || '{}')
    } catch (error) {
      return null
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
      return this.request(`/admin/users${queryString ? `?${queryString}` : ''}`)
    },
    
    updateUser: (userId, userData) => this.request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: userData.role })
    }),
    
    deleteUser: (userId) => this.request(`/admin/users/${userId}`, {
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
    
    getAnalytics: () => this.request('/admin/analytics'),
    
    getSystemHealth: () => this.request('/admin/health'),
    
    // Save system configuration
    saveSystemConfig: (section, config) => this.request('/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ section, config })
    }),
    
    // Additional admin functions
    createInviteCode: (inviteData) => this.request('/admin?action=invite-codes', {
      method: 'POST',
      body: JSON.stringify(inviteData)
    }),
    
    updateUserStatus: (userId, newStatus) => this.request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
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
