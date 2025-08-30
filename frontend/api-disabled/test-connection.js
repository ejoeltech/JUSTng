// Simple Supabase Connection Test
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

    // Check if environment variables exist
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Missing environment variables',
        supabaseUrl: supabaseUrl ? '✅ Set' : '❌ Missing',
        supabaseKey: supabaseKey ? '✅ Set' : '❌ Missing'
      })
    }

    // Try to create Supabase client
    let supabase
    try {
      supabase = createClient(supabaseUrl, supabaseKey)
    } catch (clientError) {
      return res.status(500).json({
        error: 'Failed to create Supabase client',
        details: clientError.message,
        supabaseUrl: supabaseUrl,
        supabaseKeyLength: supabaseKey ? supabaseKey.length : 0
      })
    }

    // Test basic connection
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (error) {
        // Check if it's a table doesn't exist error
        if (error.message.includes('relation "users" does not exist')) {
          return res.status(500).json({
            error: 'Database connected but tables do not exist',
            message: 'You need to run the SQL setup script in Supabase first',
            details: error.message,
            solution: 'Run SUPABASE_SETUP_FIXED.sql in Supabase SQL Editor'
          })
        }
        
        return res.status(500).json({
          error: 'Database query failed',
          details: error.message,
          code: error.code
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Database connection successful',
        data: data,
        supabaseUrl: supabaseUrl,
        supabaseKeyLength: supabaseKey.length
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
