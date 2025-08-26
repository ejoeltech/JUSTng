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
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

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

    // Sign in with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      console.error('Login error:', authError)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (authData.user && authData.session) {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
      }

      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: profile?.full_name || authData.user.user_metadata?.full_name,
          role: profile?.role || 'user',
          status: profile?.status || 'active'
        },
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at
        }
      })
    }

    return res.status(400).json({ error: 'Login failed' })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
