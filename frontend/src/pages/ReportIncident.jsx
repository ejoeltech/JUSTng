import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { MapPin, AlertTriangle, Video, Camera, Wifi, WifiOff, Save, Clock, Map, Navigation } from 'lucide-react'
import toast from 'react-hot-toast'
import LiveVideoStream from '../components/LiveVideoStream'
import PhotoUpload from '../components/PhotoUpload'
import apiService from '../services/api'
import offlineQueueService from '../services/offlineQueue'
import draftService from '../services/draftService'
import { nigerianStates, getLGAsByStateId } from '../data/nigerianStates'

const ReportIncident = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [locationAccuracy, setLocationAccuracy] = useState(null)
  const [isCapturingLocation, setIsCapturingLocation] = useState(false)
  const [showDraftRecovery, setShowDraftRecovery] = useState(false)
  const [drafts, setDrafts] = useState([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    incident_type: 'harassment',
    severity: 'medium',
    incident_date: new Date().toISOString().slice(0,16),
    address: '',
    state: '',
    lga: '',
    is_anonymous: false,
    contact_phone: '',
    witness_info: '',
    police_station: '',
    case_number: ''
  })
  
  const [recordedVideo, setRecordedVideo] = useState(null)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [currentDraftId, setCurrentDraftId] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)

  // Enhanced GPS location capture with accuracy and validation
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser')
      return
    }

    setIsCapturingLocation(true)
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const timestamp = new Date(position.timestamp)
        
        // Validate coordinates (must be within Nigeria roughly)
        if (latitude < 4 || latitude > 14 || longitude < 3 || longitude > 15) {
          toast.error('Location appears to be outside Nigeria. Please check your GPS.')
          setIsCapturingLocation(false)
          return
        }

        setLocation({ 
          latitude, 
          longitude, 
          timestamp,
          accuracy: Math.round(accuracy)
        })
        setLocationAccuracy(Math.round(accuracy))
        
        // Get address from coordinates (reverse geocoding)
        getAddressFromCoordinates(latitude, longitude)
        
        toast.success(`Location captured! Accuracy: ±${Math.round(accuracy)}m`)
        setIsCapturingLocation(false)
      },
      (error) => {
        setIsCapturingLocation(false)
        let errorMessage = 'Failed to get location'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please try again.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.'
            break
          default:
            errorMessage = 'Location error occurred. Please try again.'
        }
        
        toast.error(errorMessage)
      },
      options
    )
  }

  // Get address from coordinates using reverse geocoding
  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      )
      const data = await response.json()
      
      if (data.display_name) {
        setFormData(prev => ({
          ...prev,
          address: data.display_name
        }))
      }
    } catch (error) {
      console.log('Could not get address from coordinates:', error)
    }
  }

  // Handle state selection
  const handleStateChange = (stateId) => {
    setFormData(prev => ({
      ...prev,
      state: stateId,
      lga: '' // Reset LGA when state changes
    }))
  }

  // Handle LGA selection
  const handleLGAChange = (lgaName) => {
    setFormData(prev => ({
      ...prev,
      lga: lgaName
    }))
  }

  // Handle photo selection
  const handlePhotosSelected = (photos) => {
    setSelectedPhotos(photos)
  }

  // Handle video capture
  const handleVideoCaptured = (videoFile) => {
    setRecordedVideo(videoFile)
    toast.success('Video captured successfully!')
  }

  const handleRecordingChange = (recording) => {
    setIsRecording(recording)
  }

  // Save draft
  const saveDraft = useCallback(() => {
    if (!formData.title && !formData.description) return null // Don't save empty drafts
    
    const draftData = {
      id: currentDraftId,
      ...formData,
      location,
      selectedPhotos: selectedPhotos.map(photo => ({
        name: photo.name,
        size: photo.size,
        type: photo.type
      })),
      recordedVideo: recordedVideo ? {
        name: recordedVideo.name,
        size: recordedVideo.size,
        type: recordedVideo.type
      } : null,
      timestamp: new Date().toISOString()
    }

    const draftId = draftService.saveDraft(draftData)
    if (draftId) {
      setCurrentDraftId(draftId)
      setLastSaved(new Date())
      toast.success('Draft saved automatically')
    }
    
    return draftData
  }, [formData, location, selectedPhotos, recordedVideo, currentDraftId])

  // Start auto-save
  useEffect(() => {
    draftService.startAutoSave({}, saveDraft)
    
    return () => {
      draftService.stopAutoSave()
    }
  }, [saveDraft])

  // Load drafts on component mount
  useEffect(() => {
    const allDrafts = draftService.getAllDrafts()
    setDrafts(allDrafts)
    
    // Check for recent draft
    if (allDrafts.length > 0) {
      const latestDraft = allDrafts[0]
      const lastUpdated = new Date(latestDraft.updatedAt)
      const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceUpdate < 24) { // Show recovery option for drafts less than 24 hours old
        setShowDraftRecovery(true)
      }
    }
  }, [])

  // Recover draft
  const recoverDraft = (draft) => {
    setFormData({
      title: draft.title || '',
      description: draft.description || '',
      incident_type: draft.incident_type || 'harassment',
      severity: draft.severity || 'medium',
      incident_date: draft.incident_date || new Date().toISOString().slice(0,16),
      address: draft.address || '',
      state: draft.state || '',
      lga: draft.lga || '',
      is_anonymous: draft.is_anonymous || false,
      contact_phone: draft.contact_phone || '',
      witness_info: draft.witness_info || '',
      police_station: draft.police_station || '',
      case_number: draft.case_number || ''
    })
    
    if (draft.location) {
      setLocation(draft.location)
      setLocationAccuracy(draft.location.accuracy)
    }
    
    setCurrentDraftId(draft.id)
    setShowDraftRecovery(false)
    toast.success('Draft recovered successfully!')
  }

  // Clear current draft
  const clearCurrentDraft = () => {
    if (currentDraftId) {
      draftService.deleteDraft(currentDraftId)
      setCurrentDraftId(null)
      setLastSaved(null)
    }
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!location) {
      toast.error('Please capture location first')
      return
    }

    if (!formData.title.trim()) {
      toast.error('Please provide a title for the incident')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Please provide a description of the incident')
      return
    }

    setIsLoading(true)
    
    try {
      // Prepare incident data
      const incidentData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        incident_type: formData.incident_type,
        severity: formData.severity,
        incident_date: formData.incident_date,
        address: formData.address,
        state: formData.state,
        lga: formData.lga,
        is_anonymous: formData.is_anonymous,
        contact_phone: formData.contact_phone,
        witness_info: formData.witness_info,
        police_station: formData.police_station,
        case_number: formData.case_number,
        latitude: location.latitude,
        longitude: location.longitude,
        location_accuracy: location.accuracy,
        location_timestamp: location.timestamp,
        mediaFiles: [
          ...selectedPhotos.map(photo => photo.file),
          ...(recordedVideo ? [recordedVideo] : [])
        ]
      }

      // Check if online
      if (isOnline) {
        try {
          // Create incident
          const incident = await apiService.incidents.create(incidentData)

          // Upload media files if any
          if (incidentData.mediaFiles.length > 0) {
            try {
              for (const file of incidentData.mediaFiles) {
                await apiService.incidents.uploadMedia(file, (progress) => {
                console.log(`Upload progress: ${progress}%`)
              })
              }
              toast.success('Report with media submitted successfully!')
            } catch (uploadError) {
              console.error('Media upload failed:', uploadError)
              toast.error('Report submitted but media upload failed')
            }
          } else {
            toast.success('Report submitted successfully!')
          }

          // Clear draft after successful submission
          clearCurrentDraft()

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
      
      // Clear draft after offline submission
      clearCurrentDraft()
      
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
        {/* Draft Recovery Banner */}
        {showDraftRecovery && drafts.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    You have {drafts.length} saved draft{drafts.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-blue-700">
                    Would you like to recover your most recent draft?
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => recoverDraft(drafts[0])}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Recover Draft
                </button>
                <button
                  onClick={() => setShowDraftRecovery(false)}
                  className="px-3 py-1 text-blue-600 text-sm hover:text-blue-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 -mx-6 -mt-6 mb-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">
                Report Harassment Incident
              </h1>
              <div className="flex items-center space-x-4">
                {/* Draft Status */}
                {currentDraftId && (
                  <div className="flex items-center space-x-2 text-green-200">
                    <Save className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Draft Saved'}
                    </span>
                  </div>
                )}
                
                {/* Online Status */}
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
            {/* Enhanced Location Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-blue-900 flex items-center space-x-2">
                  <Map className="h-5 w-5" />
                  <span>Incident Location</span>
                </h3>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={isCapturingLocation}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isCapturingLocation ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Capturing...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4" />
                      <span>Capture Location</span>
                    </>
                  )}
                </button>
              </div>
              
              {location && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-800 font-medium">Location captured successfully!</p>
                  <p className="text-sm text-green-700">
                    Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                  </p>
                      {locationAccuracy && (
                        <p className="text-xs text-green-600">
                          Accuracy: ±{locationAccuracy}m
                        </p>
                      )}
                      {location.timestamp && (
                        <p className="text-xs text-green-600">
                          Captured: {new Date(location.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}&zoom=15`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        View on Map
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Nigerian States and LGAs */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select State</option>
                    {nigerianStates.map(state => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local Government Area *
                  </label>
                  <select
                    value={formData.lga}
                    onChange={(e) => handleLGAChange(e.target.value)}
                    required
                    disabled={!formData.state}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select LGA</option>
                    {formData.state && getLGAsByStateId(formData.state).map(lga => (
                      <option key={lga} value={lga}>
                        {lga}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address Input */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={2}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Street address, landmarks, or additional location details..."
                />
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Incident Type *
                </label>
                <select
                  value={formData.incident_type}
                  onChange={(e) => setFormData({...formData, incident_type: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  required
                >
                  <optgroup label="Police Misconduct">
                    <option value="harassment">Harassment & Intimidation</option>
                    <option value="assault">Physical Assault</option>
                    <option value="extortion">Extortion & Bribery</option>
                    <option value="false_accusation">False Accusation</option>
                    <option value="unlawful_detention">Unlawful Detention</option>
                    <option value="excessive_force">Excessive Force</option>
                    <option value="verbal_abuse">Verbal Abuse</option>
                  </optgroup>
                  <optgroup label="Property & Rights">
                    <option value="property_damage">Property Damage</option>
                    <option value="illegal_search">Illegal Search & Seizure</option>
                    <option value="rights_violation">Civil Rights Violation</option>
                    <option value="false_arrest">False Arrest</option>
                  </optgroup>
                  <optgroup label="Corruption">
                    <option value="bribery">Bribery & Corruption</option>
                    <option value="fraud">Fraud & Deception</option>
                    <option value="abuse_of_power">Abuse of Power</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="discrimination">Discrimination</option>
                    <option value="neglect">Neglect of Duty</option>
                    <option value="other">Other Incident</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Severity Level *
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({...formData, severity: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  required
                >
                  <option value="low">🟢 Low - Minor inconvenience, no physical harm</option>
                  <option value="medium">🟡 Medium - Moderate impact, some distress</option>
                  <option value="high">🟠 High - Significant impact, physical/emotional harm</option>
                  <option value="critical">🔴 Critical - Severe impact, life-threatening</option>
                  <option value="emergency">🚨 Emergency - Immediate danger, requires urgent response</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Incident Category
                </label>
                <select
                  value={formData.incident_category || ''}
                  onChange={(e) => setFormData({...formData, incident_category: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  <option value="">Select category</option>
                  <option value="traffic">Traffic Stop</option>
                  <option value="checkpoint">Checkpoint</option>
                  <option value="home">Home/Residence</option>
                  <option value="public">Public Place</option>
                  <option value="workplace">Workplace</option>
                  <option value="vehicle">Vehicle Search</option>
                  <option value="arrest">During Arrest</option>
                  <option value="detention">In Detention</option>
                  <option value="other_location">Other Location</option>
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
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                placeholder="Provide detailed information about the incident, including what happened, who was involved, and any other relevant details..."
                required
              />
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  placeholder="+234..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Police Station (If reported)
                </label>
                <input
                  type="text"
                  value={formData.police_station}
                  onChange={(e) => setFormData({...formData, police_station: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  placeholder="Police station name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Case Number (If assigned)
                </label>
                <input
                  type="text"
                  value={formData.case_number}
                  onChange={(e) => setFormData({...formData, case_number: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  placeholder="Police case number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Witness Information (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.witness_info}
                  onChange={(e) => setFormData({...formData, witness_info: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                  placeholder="Any witnesses or additional people involved..."
                />
              </div>
            </div>

            {/* Anonymous Reporting */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_anonymous}
                onChange={(e) => setFormData({...formData, is_anonymous: e.target.checked})}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">
                Report anonymously (your identity will be hidden)
              </label>
            </div>

            {/* Photo Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Camera className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Photo Evidence (Optional)
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Upload photos related to the incident. This can provide crucial visual evidence.
              </p>
              
              <PhotoUpload
                onPhotosSelected={handlePhotosSelected}
                maxPhotos={5}
                maxSizeMB={10}
              />
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

            {/* Form Actions */}
            <div className="flex justify-between items-center pt-6 border-t">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                {currentDraftId && (
                  <button
                    type="button"
                    onClick={clearCurrentDraft}
                    className="px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                  >
                    Clear Draft
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={!location || isLoading || !formData.title.trim() || !formData.description.trim()}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>
                    {recordedVideo || selectedPhotos.length > 0 
                      ? 'Submit Report with Media' 
                      : 'Submit Report'
                    }
                  </span>
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
