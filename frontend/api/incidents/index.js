import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://tuhsvbzbbftaxdfqvxds.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1aHN2YnpiYmZ0YXhkZnF2eGRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImiYXQiOjE3NTU5ODgyNTEsImV4cCI6MjA3MTU2NDI1MX0._AHK2ngkEQsM8Td2rHqZkjVLn9MMCsk7F1UK9u6JXgA'
)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    switch (req.method) {
      case 'GET':
        // Get all incidents
        const { data: incidents, error: fetchError } = await supabase
          .from('incidents')
          .select(`
            *,
            user_profiles!inner(full_name, email),
            states(name),
            lgas(name)
          `)
          .order('created_at', { ascending: false })

        if (fetchError) {
          console.error('Fetch incidents error:', fetchError)
          return res.status(500).json({ error: 'Failed to fetch incidents' })
        }

        return res.status(200).json(incidents)

      case 'POST':
        // Create new incident
        const { title, description, type, severity, date, address, latitude, longitude, isAnonymous } = req.body

        if (!title || !description || !type) {
          return res.status(400).json({ error: 'Missing required fields' })
        }

        const { data: newIncident, error: createError } = await supabase
          .from('incidents')
          .insert([{
            title,
            description,
            type,
            severity: severity || 'medium',
            incident_date: date || new Date().toISOString(),
            address,
            latitude: latitude || null,
            longitude: longitude || null,
            is_anonymous: isAnonymous || false,
            user_id: user.id,
            status: 'pending'
          }])
          .select()
          .single()

        if (createError) {
          console.error('Create incident error:', createError)
          return res.status(500).json({ error: 'Failed to create incident' })
        }

        return res.status(201).json(newIncident)

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Incidents API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
