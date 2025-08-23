import { supabase } from '../config/supabase'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api'

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  // Get auth token from Supabase
  async getAuthToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  // Generic request method with authentication
  async request(endpoint, options = {}) {
    const token = await this.getAuthToken()
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error)
      throw error
    }
  }

  // File upload with progress tracking
  async uploadFile(file, onProgress) {
    const token = await this.getAuthToken()
    
    const formData = new FormData()
    formData.append('file', file)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } catch (error) {
            reject(new Error('Invalid response format'))
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })

      xhr.open('POST', `${this.baseURL}/incidents/upload`)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    })
  }

  // Authentication endpoints
  auth = {
    register: (userData) => this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

    login: (credentials) => this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

    resetPassword: (email) => this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

    verifyToken: () => this.request('/auth/verify')
  }

  // Incidents endpoints
  incidents = {
    getAll: (filters = {}) => {
      const params = new URLSearchParams(filters)
      return this.request(`/incidents?${params}`)
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

    getNearby: (latitude, longitude, radius = 5000) => this.request(
      `/incidents/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`
    ),

    addUpdate: (id, updateData) => this.request(`/incidents/${id}/updates`, {
      method: 'POST',
      body: JSON.stringify(updateData)
    }),

    uploadMedia: (file, onProgress) => this.uploadFile(file, onProgress)
  }

  // Users endpoints
  users = {
    getProfile: () => this.request('/users/profile'),

    updateProfile: (profileData) => this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),

    getMyIncidents: () => this.request('/users/incidents'),

    getStats: () => this.request('/users/stats'),

    // Admin only
    getAll: (filters = {}) => {
      const params = new URLSearchParams(filters)
      return this.request(`/users?${params}`)
    },

    getById: (id) => this.request(`/users/${id}`),

    updateRole: (id, role) => this.request(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    }),

    updateStatus: (id, status) => this.request(`/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),

    delete: (id) => this.request(`/users/${id}`, {
      method: 'DELETE'
    })
  }

  // Admin endpoints
  admin = {
    getDashboardStats: () => this.request('/admin/dashboard'),

    getIncidentsForReview: (filters = {}) => {
      const params = new URLSearchParams(filters)
      return this.request(`/admin/incidents?${params}`)
    },

    updateIncident: (id, updateData) => this.request(`/admin/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    }),

    assignIncident: (id, officerId) => this.request(`/admin/incidents/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ officerId })
    }),

    changeIncidentStatus: (id, status) => this.request(`/admin/incidents/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),

    getAnalytics: (filters = {}) => {
      const params = new URLSearchParams(filters)
      return this.request(`/admin/analytics?${params}`)
    }
  }

  // SuperAdmin endpoints
  superAdmin = {
    getSystemStats: () => this.request('/super-admin/stats'),

    getSystemHealth: () => this.request('/super-admin/health'),

    getAppSettings: () => this.request('/super-admin/settings'),

    updateAppSettings: (settings) => this.request('/super-admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),

    toggleMaintenanceMode: (enabled) => this.request('/super-admin/maintenance', {
      method: 'PUT',
      body: JSON.stringify({ enabled })
    }),

    createAnnouncement: (announcement) => this.request('/super-admin/announcements', {
      method: 'POST',
      body: JSON.stringify(announcement)
    }),

    getAnnouncements: () => this.request('/super-admin/announcements'),

    updateAnnouncement: (id, updateData) => this.request(`/super-admin/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    }),

    deleteAnnouncement: (id) => this.request(`/super-admin/announcements/${id}`, {
      method: 'DELETE'
    }),

    getSystemLogs: (filters = {}) => {
      const params = new URLSearchParams(filters)
      return this.request(`/super-admin/logs?${params}`)
    },

    configureBackup: (config) => this.request('/super-admin/backup/configure', {
      method: 'POST',
      body: JSON.stringify(config)
    }),

    getBackupStatus: () => this.request('/super-admin/backup/status'),

    runDiagnostics: () => this.request('/super-admin/diagnostics', {
      method: 'POST'
    })
  }

  // Offline Queue endpoints
  offlineQueue = {
    getStats: () => this.request('/offline-queue/stats'),

    getItems: (filters = {}) => {
      const params = new URLSearchParams(filters)
      return this.request(`/offline-queue/items?${params}`)
    },

    getMyItems: () => this.request('/offline-queue/my-items'),

    addItem: (reportData) => this.request('/offline-queue/add', {
      method: 'POST',
      body: JSON.stringify(reportData)
    }),

    processQueue: (itemId = null) => this.request('/offline-queue/process', {
      method: 'POST',
      body: JSON.stringify(itemId ? { itemId } : {})
    }),

    retryFailed: () => this.request('/offline-queue/retry-failed', {
      method: 'POST'
    }),

    clearFailed: () => this.request('/offline-queue/clear-failed', {
      method: 'DELETE'
    }),

    getHealth: () => this.request('/offline-queue/health'),

    exportData: () => this.request('/offline-queue/export'),

    importData: (items) => this.request('/offline-queue/import', {
      method: 'POST',
      body: JSON.stringify({ items })
    }),

    deleteItem: (id) => this.request(`/offline-queue/items/${id}`, {
      method: 'DELETE'
    }),

    updateItemStatus: (id, status, notes) => this.request(`/offline-queue/items/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    })
  }

  // Utility methods
  utils = {
    // Check if user has required role
    hasRole: (userRole, requiredRoles) => {
      if (Array.isArray(requiredRoles)) {
        return requiredRoles.includes(userRole)
      }
      return userRole === requiredRoles
    },

    // Format API error messages
    formatError: (error) => {
      if (error.message) {
        return error.message
      }
      if (error.response?.data?.message) {
        return error.response.data.message
      }
      return 'An unexpected error occurred'
    },

    // Retry request with exponential backoff
    retry: async (fn, maxRetries = 3, delay = 1000) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn()
        } catch (error) {
          if (i === maxRetries - 1) throw error
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
        }
      }
    }
  }
}

// Create and export singleton instance
const apiService = new ApiService()
export default apiService
