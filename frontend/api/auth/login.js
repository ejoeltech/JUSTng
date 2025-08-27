import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tuhsvbzbbftaxdfqvxds.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1aHN2YnpiYmZ0YXhkZnF2eGRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImiYXQiOjE3NTU5ODgyNTEsImV4cCI6MjA3MTU2NDI1MX0._AHK2ngkEQsM8Td2rHqZkjVLn9MMCsk7F1UK9u6JXgA'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Use real Supabase authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('Supabase auth error:', error)
      return res.status(401).json({ 
        error: 'Invalid email or password',
        details: error.message 
      })
    }

    if (data.user) {
      // Get user profile from database
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: profile?.full_name || 'User',
          role: profile?.role || 'user'
        },
        session: data.session,
        timestamp: new Date().toISOString()
      })
    }

    return res.status(401).json({ error: 'Authentication failed' })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
