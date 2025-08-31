import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const SimpleMap = () => {
  const { user } = useAuth()
  const [mapStatus, setMapStatus] = useState('Loading...')
  const [error, setError] = useState(null)

  useEffect(() => {
    // Simple test to check if Leaflet is available
    if (typeof window !== 'undefined') {
      try {
        setMapStatus('Checking Leaflet availability...')
        
        // Check if Leaflet is loaded
        if (window.L) {
          setMapStatus('Leaflet found! Creating map...')
          createSimpleMap()
        } else {
          setMapStatus('Leaflet not found. Loading from CDN...')
          loadLeafletAndCreateMap()
        }
      } catch (err) {
        setError(err.message)
        setMapStatus('Error occurred')
      }
    }
  }, [])

  const loadLeafletAndCreateMap = () => {
    // Load Leaflet CSS if not already loaded
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Load Leaflet JS if not already loaded
    if (!window.L) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        setMapStatus('Leaflet loaded! Creating map...')
        setTimeout(createSimpleMap, 100) // Small delay to ensure everything is ready
      }
      script.onerror = () => {
        setError('Failed to load Leaflet from CDN')
        setMapStatus('Failed to load Leaflet')
      }
      document.head.appendChild(script)
    } else {
      createSimpleMap()
    }
  }

  const createSimpleMap = () => {
    try {
      setMapStatus('Creating map container...')
      
      // Clear any existing map
      const mapContainer = document.getElementById('simple-map')
      if (mapContainer) {
        mapContainer.innerHTML = ''
      }

      setMapStatus('Initializing Leaflet map...')
      
      // Create map centered on Lagos, Nigeria
      const map = window.L.map('simple-map', {
        center: [6.5244, 3.3792], // Lagos coordinates
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: true
      })

      setMapStatus('Adding tile layer...')

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(map)

      setMapStatus('Adding test marker...')

      // Add a test marker
      const marker = window.L.marker([6.5244, 3.3792]).addTo(map)
      marker.bindPopup('🏠 Lagos, Nigeria<br>Test marker for JUST app').openPopup()

      // Add a few more test markers for different areas of Lagos
      const testLocations = [
        { lat: 6.4531, lng: 3.3958, name: 'Victoria Island' },
        { lat: 6.5795, lng: 3.3211, name: 'Ikeja' },
        { lat: 6.4698, lng: 3.5852, name: 'Lekki' }
      ]

      testLocations.forEach(location => {
        window.L.marker([location.lat, location.lng])
          .addTo(map)
          .bindPopup(`📍 ${location.name}`)
      })

      setMapStatus('✅ Map loaded successfully!')
      setError(null)

    } catch (err) {
      console.error('Error creating map:', err)
      setError(err.message)
      setMapStatus('❌ Failed to create map')
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h2>
          <p className="text-gray-600 mb-4">You need to be logged in to view the incident map.</p>
          <a href="/login" className="btn-primary">
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Incident Map (Simple Version)</h1>
        <p className="text-gray-600">
          Testing basic map functionality for JUST incident reporting
        </p>
      </div>

      {/* Status */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900">Map Status:</h3>
        <p className="text-blue-800">{mapStatus}</p>
        {error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div 
          id="simple-map" 
          style={{ 
            height: '500px', 
            width: '100%',
            background: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            color: '#6b7280'
          }}
        >
          {mapStatus === 'Loading...' ? 'Initializing map...' : ''}
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-2">🔧 Debug Information</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>User:</strong> {user.fullName || user.email}</p>
          <p><strong>Leaflet Available:</strong> {typeof window !== 'undefined' && window.L ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Map Container:</strong> {typeof document !== 'undefined' && document.getElementById('simple-map') ? '✅ Found' : '❌ Not Found'}</p>
          <p><strong>Current Status:</strong> {mapStatus}</p>
        </div>
        
        <div className="mt-4">
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary mr-3"
          >
            🔄 Refresh Page
          </button>
          <button 
            onClick={createSimpleMap} 
            className="btn-secondary mr-3"
          >
            🗺️ Retry Map Creation
          </button>
          <a href="/test-components.html" className="btn-secondary">
            🔧 Component Test
          </a>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-6 text-center">
        <div className="space-x-4">
          <a href="/dashboard" className="btn-secondary">📊 Dashboard</a>
          <a href="/report" className="btn-secondary">📝 Report Incident</a>
          <a href="/create-demo-data.html" className="btn-secondary">📋 Demo Data</a>
        </div>
      </div>
    </div>
  )
}

export default SimpleMap
