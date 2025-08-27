// Protected Incidents API with JWT authentication
import { authenticateToken, requireRole, requireActiveStatus } from '../middleware/auth.js'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // Apply authentication middleware
  try {
    await authenticateToken(req, res, () => {})
    await requireActiveStatus(req, res, () => {})
  } catch (error) {
    return // Error already sent by middleware
  }

  try {
    switch (req.method) {
      case 'GET':
        return handleGetIncidents(req, res)
      case 'POST':
        return handleCreateIncident(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Incidents API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error' 
    })
  }
}

// Get incidents (with role-based filtering)
async function handleGetIncidents(req, res) {
  try {
    const { user } = req
    const { page = 1, limit = 10, status, severity, location } = req.query

    // Simulated incidents database
    const mockIncidents = [
      {
        id: 'incident-001',
        title: 'Police harassment at Lekki',
        description: 'Officer demanded bribe for traffic violation',
        location: { lat: 6.5244, lng: 3.3792, address: 'Lekki, Lagos' },
        status: 'investigating',
        severity: 'high',
        category: 'bribery',
        reporterId: 'user-003',
        reporterName: 'John Doe',
        createdAt: '2024-08-23T10:00:00Z',
        updatedAt: '2024-08-23T15:30:00Z',
        evidence: ['photo-001.jpg', 'video-001.mp4'],
        assignedTo: 'police-001',
        priority: 'high'
      },
      {
        id: 'incident-002',
        title: 'Unlawful arrest in Victoria Island',
        description: 'Arrested without proper cause or warrant',
        location: { lat: 6.4281, lng: 3.4219, address: 'Victoria Island, Lagos' },
        status: 'reported',
        severity: 'medium',
        category: 'unlawful_arrest',
        reporterId: 'user-003',
        reporterName: 'Jane Smith',
        createdAt: '2024-08-22T14:20:00Z',
        updatedAt: '2024-08-22T14:20:00Z',
        evidence: ['photo-002.jpg'],
        assignedTo: null,
        priority: 'medium'
      }
    ]

    // Role-based filtering
    let filteredIncidents = mockIncidents

    if (user.role === 'user') {
      // Users can only see their own incidents
      filteredIncidents = mockIncidents.filter(incident => incident.reporterId === user.userId)
    } else if (user.role === 'police') {
      // Police can see incidents in their jurisdiction
      filteredIncidents = mockIncidents.filter(incident => 
        incident.status === 'reported' || incident.assignedTo === user.userId
      )
    }
    // Admin and SuperAdmin can see all incidents

    // Apply filters
    if (status) {
      filteredIncidents = filteredIncidents.filter(incident => incident.status === status)
    }
    if (severity) {
      filteredIncidents = filteredIncidents.filter(incident => incident.severity === severity)
    }
    if (location) {
      // Simple location filtering (in production, use geospatial queries)
      filteredIncidents = filteredIncidents.filter(incident => 
        incident.location.address.toLowerCase().includes(location.toLowerCase())
      )
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + parseInt(limit)
    const paginatedIncidents = filteredIncidents.slice(startIndex, endIndex)

    return res.status(200).json({
      incidents: paginatedIncidents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredIncidents.length / limit),
        totalIncidents: filteredIncidents.length,
        hasNextPage: endIndex < filteredIncidents.length,
        hasPrevPage: page > 1
      },
      filters: {
        status,
        severity,
        location
      },
      userRole: user.role,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Get incidents error:', error)
    return res.status(500).json({ 
      error: 'Failed to retrieve incidents' 
    })
  }
}

// Create new incident
async function handleCreateIncident(req, res) {
  try {
    const { user } = req
    const { title, description, location, category, severity, evidence } = req.body

    // Validate required fields
    if (!title || !description || !location || !category) {
      return res.status(400).json({ 
        error: 'Title, description, location, and category are required' 
      })
    }

    // Validate location format
    if (!location.lat || !location.lng || !location.address) {
      return res.status(400).json({ 
        error: 'Location must include latitude, longitude, and address' 
      })
    }

    // Create new incident
    const newIncident = {
      id: 'incident-' + Date.now(),
      title,
      description,
      location,
      status: 'reported',
      severity: severity || 'medium',
      category,
      reporterId: user.userId,
      reporterName: user.fullName || 'Anonymous',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: evidence || [],
      assignedTo: null,
      priority: severity === 'high' ? 'high' : severity === 'critical' ? 'urgent' : 'medium'
    }

    // In production, save to database
    // For now, just return the created incident

    return res.status(201).json({
      message: 'Incident reported successfully',
      incident: newIncident,
      nextSteps: [
        'Your incident has been recorded',
        'You will receive updates on the status',
        'Evidence has been securely stored',
        'Authorities will be notified if required'
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Create incident error:', error)
    return res.status(500).json({ 
      error: 'Failed to create incident' 
    })
  }
}
