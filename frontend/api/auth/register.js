import { createClient } from '@supabase/supabase-js'

// TEMPORARY: Hardcoded values for immediate testing
const supabaseUrl = 'https://tuhsvbzbbftaxdfqvxds.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1aHN2YnpiYmZ0YXhkZnF2eGRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImiYXQiOjE3NTU5ODgyNTEsImV4cCI6MjA3MTU2NDI1MX0._AHK2ngkEQsM8Td2rHqZkjVLn9MMCsk7F1UK9u6JXgA'

console.log('Register function - Using hardcoded Supabase URL:', supabaseUrl)
console.log('Register function - Service key exists:', !!supabaseServiceKey)

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
    const { email, password, fullName, phone } = req.body

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' })
    }

    console.log('Attempting registration for:', email)

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null
        }
      }
    })

    if (authError) {
      console.error('Supabase auth error:', authError)
      return res.status(400).json({ 
        error: 'Registration failed',
        details: authError.message 
      })
    }

    if (authData.user) {
      console.log('User created successfully:', authData.user.id)
      
      // Create user profile in database
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: authData.user.email,
            full_name: fullName,
            phone: phone || null,
            role: 'user',
            created_at: new Date().toISOString()
          }
        ])

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // User was created but profile failed - still return success
      }

      return res.status(201).json({
        message: 'Registration successful',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          fullName,
          phone: phone || null,
          role: 'user'
        },
        timestamp: new Date().toISOString()
      })
    }

    return res.status(400).json({ error: 'Registration failed' })

  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}
