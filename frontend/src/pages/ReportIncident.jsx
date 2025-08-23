import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { MapPin, AlertTriangle, Video, Camera, Wifi, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'
import LiveVideoStream from '../components/LiveVideoStream'
import apiService from '../services/api'
import offlineQueueService from '../services/offlineQueue'

const ReportIncident = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [location, setLocation] = useState(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incident_type: 'harassment',
    severity: 'medium',
    incident_date: new Date().toISOString().slice(0,16),
    address: '',
    is_anonymous: false
  })
  const [recordedVideo, setRecordedVideo] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLocation({ latitude, longitude })
        toast.success('Location captured')
      },
      (error) => {
        toast.error('Failed to get location')
      }
    )
  }

  const handleVideoCaptured = (videoFile) => {
    setRecordedVideo(videoFile)
    toast.success('Video captured successfully!')
  }

  const handleRecordingChange = (recording) => {
    setIsRecording(recording)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!location) {
      toast.error('Please capture location first')
      return
    }

    setIsLoading(true)
    
    try {
      // Prepare incident data
      const incidentData = {
        title: formData.title,
        description: formData.description,
        incident_type: formData.incident_type,
        severity: formData.severity,
        incident_date: formData.incident_date,
        address: formData.address,
        is_anonymous: formData.is_anonymous,
        latitude: location.latitude,
        longitude: location.longitude,
        mediaFiles: recordedVideo ? [recordedVideo] : []
      }

      // Check if online
      if (isOnline) {
        try {
          // Create incident
          const incident = await apiService.incidents.create(incidentData)

          // Upload video if recorded
          if (recordedVideo) {
            try {
              await apiService.incidents.uploadMedia(recordedVideo, (progress) => {
                console.log(`Upload progress: ${progress}%`)
              })
              toast.success('Report with video submitted successfully!')
            } catch (uploadError) {
              console.error('Video upload failed:', uploadError)
              toast.error('Report submitted but video upload failed')
            }
          } else {
            toast.success('Report submitted successfully!')
          }

          navigate('/dashboard')
        } catch (error) {
          console.error('Error submitting report:', error)
          // Fall back to offline queue if API fails
          await handleOfflineSubmission(incidentData)
        }
      } else {
        // Offline mode - save to queue
        await handleOfflineSubmission(incidentData)
      }
    } catch (error) {
      console.error('Error submitting report:', error)
      toast.error('Failed to submit report. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOfflineSubmission = async (incidentData) => {
    try {
      await offlineQueueService.addToQueue(incidentData)
      toast.success('Report saved offline. Will sync when connection is restored.')
      navigate('/dashboard')
    } catch (error) {
      console.error('Error saving to offline queue:', error)
      toast.error('Failed to save report offline. Please try again when online.')
    }
  }

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 -mx-6 -mt-6 mb-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">
                Report Harassment Incident
              </h1>
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <div className="flex items-center space-x-2 text-green-200">
                    <Wifi className="h-5 w-5" />
                    <span className="text-sm font-medium">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-yellow-200">
                    <WifiOff className="h-5 w-5" />
                    <span className="text-sm font-medium">Offline</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-blue-900">
                  Incident Location
                </h3>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Capture Location
                </button>
              </div>
              
              {location && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800">Location captured!</p>
                  <p className="text-sm text-green-700">
                    Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                placeholder="Brief description of what happened"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                placeholder="Provide detailed information about the incident..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Incident Type
                </label>
                <select
                  value={formData.incident_type}
                  onChange={(e) => setFormData({...formData, incident_type: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  <option value="harassment">Harassment</option>
                  <option value="assault">Assault</option>
                  <option value="extortion">Extortion</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Severity Level
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({...formData, severity: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                When did this happen? *
              </label>
              <input
                type="datetime-local"
                value={formData.incident_date}
                onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_anonymous}
                onChange={(e) => setFormData({...formData, is_anonymous: e.target.checked})}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">
                Report anonymously
              </label>
            </div>

            {/* Video Recording Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Video className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Video Evidence (Optional)
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Record live video evidence of the incident. This can provide crucial visual and audio evidence.
              </p>
              
              <LiveVideoStream
                onVideoCaptured={handleVideoCaptured}
                isRecording={isRecording}
                onRecordingChange={handleRecordingChange}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
                                              <button
                  type="submit"
                  disabled={!location || isLoading}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>{recordedVideo ? 'Submit Report with Video' : 'Submit Report'}</span>
                  )}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ReportIncident
