// Simple Database Test - Bypasses RLS
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // Get environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Testing connection with:')
    console.log('URL:', supabaseUrl)
    console.log('Key length:', supabaseKey ? supabaseKey.length : 'MISSING')

    // Check if environment variables exist
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Missing environment variables',
        supabaseUrl: supabaseUrl ? '✅ Set' : '❌ Missing',
        supabaseKey: supabaseKey ? '✅ Set' : '❌ Missing'
      })
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Test 1: Basic connection (should work with service role)
    try {
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (testError) {
        return res.status(500).json({
          error: 'Database query failed',
          details: testError.message,
          code: testError.code,
          hint: 'RLS policies may be blocking service role access'
        })
      }

      // Test 2: Try to get admin user
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('id, email, full_name, role, status')
        .eq('email', 'admin@just-app.ng')
        .single()

      if (adminError) {
        return res.status(500).json({
          error: 'Admin user query failed',
          details: adminError.message,
          code: adminError.code
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Database connection successful!',
        connection: {
          url: supabaseUrl,
          keyLength: supabaseKey.length,
          serviceRole: '✅ Active'
        },
        testResults: {
          basicQuery: '✅ Working',
          adminUser: adminData ? '✅ Found' : '❌ Not found',
          adminData: adminData
        }
      })

    } catch (queryError) {
      return res.status(500).json({
        error: 'Database query error',
        details: queryError.message,
        type: queryError.constructor.name
      })
    }

  } catch (error) {
    return res.status(500).json({
      error: 'Unexpected error',
      details: error.message,
      stack: error.stack
    })
  }
}
