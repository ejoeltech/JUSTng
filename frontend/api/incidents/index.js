import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Helper function to verify JWT token
async function verifyToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }
  
  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    throw new Error('Invalid token')
  }
  
  return user
}

export default async function handler(req, res) {
  try {
    const user = await verifyToken(req)
    
    switch (req.method) {
      case 'GET':
        // Get all incidents
        const { data: incidents, error: fetchError } = await supabase
          .from('incidents')
          .select(`
            *,
            user_profiles!inner(full_name, email, phone),
            states(name),
            lgas(name)
          `)
          .order('created_at', { ascending: false })

        if (fetchError) {
          console.error('Fetch incidents error:', fetchError)
          return res.status(500).json({
            error: 'Failed to fetch incidents',
            message: fetchError.message
          })
        }

        res.status(200).json({
          success: true,
          incidents: incidents || []
        })
        break

      case 'POST':
        // Create new incident
        const { title, description, type, severity, date, address, latitude, longitude, isAnonymous } = req.body

        if (!title || !description || !type) {
          return res.status(400).json({
            error: 'Missing required fields',
            message: 'Title, description, and type are required'
          })
        }

        const newIncident = {
          title,
          description,
          type,
          severity: severity || 'medium',
          incident_date: date || new Date().toISOString(),
          address: address || null,
          latitude: latitude || null,
          longitude: longitude || null,
          is_anonymous: isAnonymous || false,
          user_id: user.id,
          status: 'reported',
          created_at: new Date().toISOString()
        }

        const { data: createdIncident, error: createError } = await supabase
          .from('incidents')
          .insert([newIncident])
          .select()
          .single()

        if (createError) {
          console.error('Create incident error:', createError)
          return res.status(500).json({
            error: 'Failed to create incident',
            message: createError.message
          })
        }

        res.status(201).json({
          success: true,
          message: 'Incident created successfully',
          incident: createdIncident
        })
        break

      default:
        res.setHeader('Allow', ['GET', 'POST'])
        res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Incidents API error:', error)
    
    if (error.message === 'No token provided') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token required'
      })
    }
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authentication token'
      })
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
}
