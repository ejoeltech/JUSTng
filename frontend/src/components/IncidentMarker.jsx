import React, { useState, useRef, useEffect } from 'react'
import { Marker, Popup, CircleMarker } from 'react-leaflet'
import { Icon, DivIcon } from 'leaflet'
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Eye, 
  Edit, 
  Trash2, 
  Phone, 
  Mail,
  Camera,
  Video,
  FileText,
  Users,
  Shield,
  TrendingUp
} from 'lucide-react'
import { getStateById } from '../data/nigerianStates'

// Custom marker icons for different severities
const createSeverityIcon = (severity, isCluster = false) => {
  const colors = {
    low: '#10B981',
    medium: '#F59E0B', 
    high: '#F97316',
    critical: '#EF4444'
  }
  
  const size = isCluster ? 30 : 20
  const color = colors[severity] || '#6B7280'
  
  return new DivIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${isCluster ? '12px' : '10px'};
        cursor: pointer;
        transition: all 0.2s ease;
      " 
        onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.4)'"
        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.3)'"
      >
        ${isCluster ? 'C' : severity.charAt(0).toUpperCase()}
      </div>
    `,
    className: 'custom-incident-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  })
}

// Incident Marker Component
const IncidentMarker = ({ 
  incident, 
  isCluster = false, 
  clusterCount = 1,
  onMarkerClick,
  onEdit,
  onDelete,
  userRole,
  isSelected = false
}) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [showFullDetails, setShowFullDetails] = useState(false)
  const markerRef = useRef(null)

  // Handle marker click
  const handleMarkerClick = () => {
    if (onMarkerClick) {
      onMarkerClick(incident)
    }
    setIsPopupOpen(true)
  }

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    
    return date.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get severity color
  const getSeverityColor = (severity) => {
    const colors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#F97316',
      critical: '#EF4444'
    }
    return colors[severity] || '#6B7280'
  }

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      reported: '#3B82F6',
      investigating: '#F59E0B',
      under_review: '#F97316',
      resolved: '#10B981',
      closed: '#6B7280'
    }
    return colors[status] || '#6B7280'
  }

  // Get incident type icon
  const getIncidentTypeIcon = (type) => {
    const icons = {
      harassment: <AlertTriangle className="h-4 w-4" />,
      assault: <Shield className="h-4 w-4" />,
      extortion: <TrendingUp className="h-4 w-4" />,
      false_accusation: <FileText className="h-4 w-4" />,
      unlawful_detention: <Users className="h-4 w-4" />,
      property_damage: <AlertTriangle className="h-4 w-4" />,
      other: <AlertTriangle className="h-4 w-4" />
    }
    return icons[type] || icons.other
  }

  // Handle edit
  const handleEdit = (e) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit(incident)
    }
  }

  // Handle delete
  const handleDelete = (e) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(incident.id)
    }
  }

  // If it's a cluster, render cluster marker
  if (isCluster) {
    return (
      <CircleMarker
        center={[incident.center.lat, incident.center.lng]}
        radius={20}
        pathOptions={{
          color: getSeverityColor(incident.severity),
          fillColor: getSeverityColor(incident.severity),
          fillOpacity: 0.7,
          weight: 2
        }}
        eventHandlers={{
          click: handleMarkerClick
        }}
      >
        <Popup>
          <div className="p-3">
            <h3 className="font-semibold text-gray-900 mb-2">
              Incident Cluster ({incident.count} incidents)
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              Multiple incidents in this area
            </p>
            <div className="text-xs text-gray-500">
              <p>Click to view individual incidents</p>
            </div>
          </div>
        </Popup>
      </CircleMarker>
    )
  }

  // Render individual incident marker
  return (
    <Marker
      ref={markerRef}
      position={[incident.latitude, incident.longitude]}
      icon={createSeverityIcon(incident.severity, false)}
      eventHandlers={{
        click: handleMarkerClick
      }}
    >
      <Popup
        onOpen={() => setIsPopupOpen(true)}
        onClose={() => setIsPopupOpen(false)}
        className="incident-popup"
        maxWidth={400}
        minWidth={300}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getIncidentTypeIcon(incident.incident_type)}
              <h3 className="font-semibold text-gray-900 text-lg">
                {incident.title}
              </h3>
            </div>
            
            {/* Severity Badge */}
            <div
              className="px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: getSeverityColor(incident.severity) }}
            >
              {incident.severity}
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-3">
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: getStatusColor(incident.status) + '20',
                color: getStatusColor(incident.status)
              }}
            >
              {incident.status.replace('_', ' ')}
            </span>
          </div>

          {/* Description */}
          <p className="text-gray-700 mb-3 line-clamp-2">
            {incident.description}
          </p>

          {/* Location Info */}
          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {incident.address || 'Location captured'}
                </p>
                {incident.state && (
                  <p className="text-gray-600">
                    {getStateById(incident.state)?.name}
                    {incident.lga && `, ${incident.lga}`}
                  </p>
                )}
                <p className="text-gray-500 text-xs">
                  Lat: {incident.latitude.toFixed(6)}, Lng: {incident.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
            <Clock className="h-4 w-4" />
            <span>{formatDate(incident.incident_date)} at {formatTime(incident.incident_date)}</span>
          </div>

          {/* Media Files */}
          {(incident.mediaFiles && incident.mediaFiles.length > 0) && (
            <div className="mb-3 p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <Camera className="h-4 w-4" />
                <span>{incident.mediaFiles.length} media file(s) attached</span>
              </div>
            </div>
          )}

          {/* Additional Details (if expanded) */}
          {showFullDetails && (
            <div className="space-y-2 text-sm text-gray-600">
              {incident.contact_phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>{incident.contact_phone}</span>
                </div>
              )}
              
              {incident.witness_info && (
                <div className="flex items-start space-x-2">
                  <Users className="h-4 w-4 mt-0.5" />
                  <span>{incident.witness_info}</span>
                </div>
              )}
              
              {incident.police_station && (
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>{incident.police_station}</span>
                </div>
              )}
              
              {incident.case_number && (
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Case: {incident.case_number}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex space-x-2">
              <button
                onClick={() => setShowFullDetails(!showFullDetails)}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                {showFullDetails ? 'Show Less' : 'Show More'}
              </button>
              
              <button
                onClick={() => {
                  // Copy coordinates to clipboard
                  navigator.clipboard.writeText(
                    `${incident.latitude}, ${incident.longitude}`
                  )
                }}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                title="Copy coordinates"
              >
                Copy Coords
              </button>
            </div>

            {/* Admin Actions */}
            {userRole && ['admin', 'superadmin'].includes(userRole) && (
              <div className="flex space-x-2">
                <button
                  onClick={handleEdit}
                  className="p-1 text-blue-600 hover:text-blue-700"
                  title="Edit incident"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 text-red-600 hover:text-red-700"
                  title="Delete incident"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
            <p>ID: {incident.id}</p>
            {incident.is_anonymous ? (
              <p>Reported anonymously</p>
            ) : (
              <p>Reported by: {incident.reporter_name || 'User'}</p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

export default IncidentMarker
