import express from 'express'
import { body, validationResult } from 'express-validator'
import { createClient } from '@supabase/supabase-js'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'

const router = express.Router()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '100000000'), // 100MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image and video files are allowed'), false)
    }
  }
})

// Validation middleware
const validateIncident = [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('incident_type').isIn(['harassment', 'assault', 'extortion', 'unlawful_arrest', 'other']).withMessage('Invalid incident type'),
  body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('state_id').optional().isInt().withMessage('Invalid state ID'),
  body('lga_id').optional().isInt().withMessage('Invalid LGA ID'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address must be less than 500 characters'),
  body('incident_date').isISO8601().withMessage('Invalid incident date'),
  body('is_anonymous').optional().isBoolean().withMessage('is_anonymous must be a boolean')
]

// Get all incidents (with pagination and filtering)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      state_id,
      lga_id,
      incident_type,
      start_date,
      end_date
    } = req.query

    let query = supabase
      .from('incidents')
      .select(`
        *,
        user_profiles!inner(full_name, email, phone),
        states(name, code),
        lgas(name)
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status) query = query.eq('status', status)
    if (severity) query = query.eq('severity', severity)
    if (state_id) query = query.eq('state_id', state_id)
    if (lga_id) query = query.eq('lga_id', lga_id)
    if (incident_type) query = query.eq('incident_type', incident_type)
    if (start_date) query = query.gte('incident_date', start_date)
    if (end_date) query = query.lte('incident_date', end_date)

    // Get total count for pagination
    const { count } = await query.count()

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: incidents, error } = await query

    if (error) throw error

    res.json({
      incidents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching incidents:', error)
    res.status(500).json({
      error: 'Failed to fetch incidents',
      message: error.message
    })
  }
})

// Get incident by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data: incident, error } = await supabase
      .from('incidents')
      .select(`
        *,
        user_profiles!inner(full_name, email, phone),
        states(name, code),
        lgas(name),
        incident_updates(
          *,
          user_profiles(full_name, email)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Incident not found',
          message: 'The requested incident does not exist'
        })
      }
      throw error
    }

    res.json({ incident })

  } catch (error) {
    console.error('Error fetching incident:', error)
    res.status(500).json({
      error: 'Failed to fetch incident',
      message: error.message
    })
  }
})

// Create new incident
router.post('/', upload.array('media', 10), validateIncident, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      })
    }

    const {
      title,
      description,
      incident_type,
      severity,
      latitude,
      longitude,
      state_id,
      lga_id,
      address,
      incident_date,
      is_anonymous = false
    } = req.body

    const userId = req.user.id

    // Handle file uploads
    let mediaUrls = { photos: [], videos: [] }
    
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileExt = file.originalname.split('.').pop()
        const fileName = `${uuidv4()}.${fileExt}`
        const bucketName = file.mimetype.startsWith('image/') ? 'incident-photos' : 'incident-videos'
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600'
          })

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName)

        if (file.mimetype.startsWith('image/')) {
          mediaUrls.photos.push(publicUrl)
        } else {
          mediaUrls.videos.push(publicUrl)
        }
      }
    }

    // Create incident
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .insert([{
        user_id: userId,
        title,
        description,
        incident_type,
        severity,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        state_id: state_id ? parseInt(state_id) : null,
        lga_id: lga_id ? parseInt(lga_id) : null,
        address,
        incident_date,
        is_anonymous,
        photos: mediaUrls.photos,
        videos: mediaUrls.videos
      }])
      .select()
      .single()

    if (incidentError) throw incidentError

    // Create initial update
    await supabase
      .from('incident_updates')
      .insert([{
        incident_id: incident.id,
        user_id: userId,
        update_type: 'status_change',
        content: 'Incident reported',
        metadata: { status: 'reported' }
      }])

    res.status(201).json({
      message: 'Incident reported successfully',
      incident
    })

  } catch (error) {
    console.error('Error creating incident:', error)
    res.status(500).json({
      error: 'Failed to create incident',
      message: error.message
    })
  }
})

// Update incident
router.put('/:id', validateIncident, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Check if user can update this incident
    const { data: existingIncident, error: fetchError } = await supabase
      .from('incidents')
      .select('user_id, status')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    if (existingIncident.user_id !== userId && req.user.role === 'user') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own incidents'
      })
    }

    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please check your input',
        details: errors.array()
      })
    }

    const updateData = { ...req.body }
    delete updateData.id // Remove ID from update data

    const { data: incident, error } = await supabase
      .from('incidents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Create update record
    await supabase
      .from('incident_updates')
      .insert([{
        incident_id: id,
        user_id: userId,
        update_type: 'status_change',
        content: 'Incident updated',
        metadata: { updated_fields: Object.keys(updateData) }
      }])

    res.json({
      message: 'Incident updated successfully',
      incident
    })

  } catch (error) {
    console.error('Error updating incident:', error)
    res.status(500).json({
      error: 'Failed to update incident',
      message: error.message
    })
  }
})

// Add update to incident
router.post('/:id/updates', async (req, res) => {
  try {
    const { id } = req.params
    const { update_type, content, metadata } = req.body
    const userId = req.user.id

    if (!update_type || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'update_type and content are required'
      })
    }

    const { data: update, error } = await supabase
      .from('incident_updates')
      .insert([{
        incident_id: id,
        user_id: userId,
        update_type,
        content,
        metadata: metadata || {}
      }])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      message: 'Update added successfully',
      update
    })

  } catch (error) {
    console.error('Error adding update:', error)
    res.status(500).json({
      error: 'Failed to add update',
      message: error.message
    })
  }
})

// Get nearby incidents
router.get('/nearby/:latitude/:longitude', async (req, res) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.params

    const { data: incidents, error } = await supabase
      .rpc('get_nearby_incidents', {
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        radius_meters: parseInt(radius)
      })

    if (error) throw error

    res.json({ incidents })

  } catch (error) {
    console.error('Error fetching nearby incidents:', error)
    res.status(500).json({
      error: 'Failed to fetch nearby incidents',
      message: error.message
    })
  }
})

// Delete incident (only by owner or admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Check if user can delete this incident
    const { data: incident, error: fetchError } = await supabase
      .from('incidents')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    if (incident.user_id !== userId && req.user.role === 'user') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own incidents'
      })
    }

    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id)

    if (error) throw error

    res.json({
      message: 'Incident deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting incident:', error)
    res.status(500).json({
      error: 'Failed to delete incident',
      message: error.message
    })
  }
})

export default router
