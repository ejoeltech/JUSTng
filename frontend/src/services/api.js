import { supabase } from '../config/supabase'

// Simple API service - will be replaced with Vercel Functions after deployment
class ApiService {
  constructor() {
    this.baseURL = '/api' // Will be set to Vercel Functions URL after deployment
    console.log('API Service initialized')
  }

  // Get auth token from Supabase
  async getAuthToken() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  // Generic request method
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

    const fullUrl = `${this.baseURL}${endpoint}`
    console.log(`Making API request to: ${fullUrl}`)

    try {
      const response = await fetch(fullUrl, config)
      
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
    getAll: () => this.request('/incidents'),
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
    uploadMedia: (file, onProgress) => {
      const formData = new FormData()
      formData.append('file', file)
      
      return fetch(`${this.baseURL}/incidents/upload`, {
        method: 'POST',
        body: formData
      })
    }
  }

  // Users endpoints
  users = {
    getProfile: () => this.request('/users/profile'),
    updateProfile: (profileData) => this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),
    getIncidents: () => this.request('/users/incidents'),
    getStats: () => this.request('/users/stats')
  }

  // Admin endpoints
  admin = {
    getStats: () => this.request('/admin/stats'),
    getIncidents: () => this.request('/admin/incidents'),
    updateIncident: (id, updateData) => this.request(`/admin/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    }),
    assignOfficer: (incidentId, officerId) => this.request(`/admin/incidents/${incidentId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ officerId })
    })
  }

  // Super Admin endpoints
  superAdmin = {
    getSystemStats: () => this.request('/super-admin/stats'),
    getAppSettings: () => this.request('/super-admin/settings'),
    updateAppSettings: (settings) => this.request('/super-admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),
    toggleMaintenance: (enabled) => this.request('/super-admin/maintenance', {
      method: 'POST',
      body: JSON.stringify({ enabled })
    })
  }
}

export default new ApiService()
