import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { email, password, fullName, phone } = req.body

      // Validate input
      if (!email || !password || !fullName) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Email, password, and full name are required'
        })
      }

      // Create user in Supabase
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
          message: authError.message
        })
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: authData.user.id,
            full_name: fullName,
            email: email,
            phone: phone,
            role: 'user',
            status: 'active'
          }
        ])

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // User was created but profile failed - we should handle this gracefully
        console.warn('User created but profile creation failed:', profileError)
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          fullName,
          role: 'user'
        }
      })

    } catch (error) {
      console.error('Registration error:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to register user'
      })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).json({ error: 'Method not allowed' })
  }
}
