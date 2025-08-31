// Protected Incidents API with real database integration
import { authenticateToken, requireRole, requireActiveStatus } from '../../lib/middleware/auth.js'
import databaseService from '../../lib/services/database.js'

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
        // Check if this is an upload request
        if (req.url?.includes('/upload') || req.body?.files) {
          return handleFileUpload(req, res)
        }
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

// Get incidents from database with role-based filtering
async function handleGetIncidents(req, res) {
  try {
    const { user } = req
    const { page = 1, limit = 10, status, severity, location, category } = req.query

    // Prepare filters
    const filters = {}
    if (status) filters.status = status
    if (severity) filters.severity = severity
    if (location) filters.location = location
    if (category) filters.category = category

    // Get incidents from database
    const result = await databaseService.getIncidents(filters, user.role, user.userId)
    
    if (result.error) {
      console.error('Database error:', result.error)
      return res.status(500).json({ 
        error: 'Failed to retrieve incidents from database' 
      })
    }

    return res.status(200).json({
      incidents: result.data,
      pagination: result.pagination,
      filters: {
        status,
        severity,
        location,
        category
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

// Create new incident in database
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

    // Create new incident object
    const incidentData = {
      id: 'incident-' + Date.now(),
      title,
      description,
      location,
      status: 'reported',
      severity: severity || 'medium',
      category,
      reporterId: user.userId,
      reporterName: user.fullName || 'Anonymous',
      evidence: evidence || [],
      assignedTo: null,
      priority: severity === 'high' ? 'high' : severity === 'critical' ? 'urgent' : 'medium'
    }

    // Save incident to database
    const dbResult = await databaseService.createIncident(incidentData)
    if (dbResult.error) {
      console.error('Database error:', dbResult.error)
      return res.status(500).json({ 
        error: 'Failed to create incident. Please try again.' 
      })
    }

    return res.status(201).json({
      message: 'Incident reported successfully',
      incident: dbResult.data,
      nextSteps: [
        'Your incident has been recorded in our secure database',
        'You will receive updates on the status',
        'Evidence has been securely stored',
        'Authorities will be notified if required',
        'You can track your incident in your dashboard'
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

// Handle file uploads for incidents
async function handleFileUpload(req, res) {
  try {
    const { user } = req
    const { incidentId, files } = req.body

    if (!incidentId || !files || !Array.isArray(files)) {
      return res.status(400).json({
        error: 'incidentId and files array are required'
      })
    }

    // Validate incident exists and user has access
    const incidentResult = await databaseService.getIncidentById(incidentId)
    if (incidentResult.error || !incidentResult.data) {
      return res.status(404).json({
        error: 'Incident not found or access denied'
      })
    }

    const uploadResults = []
    const errors = []

    // Process each file
    for (const fileData of files) {
      try {
        const result = await databaseService.uploadFile(fileData, incidentId, user.userId)
        if (result.error) {
          errors.push(`${fileData.filename}: ${result.error.message}`)
        } else {
          uploadResults.push(result.data)
        }
      } catch (fileError) {
        errors.push(`${fileData.filename}: Processing error`)
      }
    }

    const success = uploadResults.length > 0
    return res.status(success ? 200 : 400).json({
      success,
      message: success 
        ? `Successfully uploaded ${uploadResults.length} file(s)`
        : 'No files were uploaded successfully',
      uploads: uploadResults,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: files.length,
        successful: uploadResults.length,
        failed: errors.length
      }
    })

  } catch (error) {
    console.error('File upload error:', error)
    return res.status(500).json({ 
      error: 'Failed to upload files' 
    })
  }
}
