import { useState, useEffect } from 'react'
import { apiService } from '../services/api'

const BackendStatus = () => {
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState(null)
  const [backendUrl, setBackendUrl] = useState('')

  useEffect(() => {
    const checkBackend = async () => {
      try {
        setBackendUrl(apiService.baseURL)
        
        // Test backend connection
        const response = await fetch(apiService.baseURL.replace('/api', '/health'))
        if (response.ok) {
          setStatus('connected')
        } else {
          setStatus('error')
          setError(`Backend responded with status: ${response.status}`)
        }
      } catch (err) {
        setStatus('error')
        setError(err.message)
      }
    }

    checkBackend()
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'text-green-600'
      case 'error': return 'text-red-600'
      default: return 'text-yellow-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return '✅'
      case 'error': return '❌'
      default: return '⏳'
    }
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h3 className="font-semibold mb-2">Backend Connection Status</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={getStatusColor()}>
            {getStatusIcon()} {status.toUpperCase()}
          </span>
        </div>
        
        <div className="text-sm text-gray-600">
          <strong>Backend URL:</strong> {backendUrl}
        </div>
        
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
            <strong>Solution:</strong> Make sure your backend is deployed and the VITE_BACKEND_URL environment variable is set correctly in Vercel.
          </div>
        )}
      </div>
    </div>
  )
}

export default BackendStatus
