// Fix Admin User - Check and recreate if needed
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

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

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Missing environment variables',
        supabaseUrl: supabaseUrl ? '✅ Set' : '❌ Missing',
        supabaseKey: supabaseKey ? '✅ Set' : '❌ Missing'
      })
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if admin user exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@just-app.ng')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(500).json({
        error: 'Error checking admin user',
        details: checkError.message
      })
    }

    if (existingAdmin) {
      // Admin exists, check if password is correct
      const testPassword = 'admin123456'
      const isValidPassword = await bcrypt.compare(testPassword, existingAdmin.password)
      
      if (isValidPassword) {
        return res.status(200).json({
          success: true,
          message: 'Admin user exists and password is correct',
          admin: {
            id: existingAdmin.id,
            email: existingAdmin.email,
            full_name: existingAdmin.full_name,
            role: existingAdmin.role,
            status: existingAdmin.status,
            email_verified: existingAdmin.email_verified
          }
        })
      } else {
        // Password is wrong, update it
        const newPasswordHash = await bcrypt.hash(testPassword, 12)
        
        const { data: updatedAdmin, error: updateError } = await supabase
          .from('users')
          .update({ 
            password: newPasswordHash,
            status: 'active',
            email_verified: true
          })
          .eq('email', 'admin@just-app.ng')
          .select()
          .single()

        if (updateError) {
          return res.status(500).json({
            error: 'Failed to update admin password',
            details: updateError.message
          })
        }

        return res.status(200).json({
          success: true,
          message: 'Admin user password updated successfully',
          admin: {
            id: updatedAdmin.id,
            email: updatedAdmin.email,
            full_name: updatedAdmin.full_name,
            role: updatedAdmin.role,
            status: updatedAdmin.status,
            email_verified: updatedAdmin.email_verified
          }
        })
      }
    } else {
      // Admin doesn't exist, create it
      const password = 'admin123456'
      const passwordHash = await bcrypt.hash(password, 12)
      
      const { data: newAdmin, error: createError } = await supabase
        .from('users')
        .insert([{
          id: 'admin-001',
          email: 'admin@just-app.ng',
          full_name: 'System Administrator',
          role: 'superAdmin',
          status: 'active',
          email_verified: true,
          password: passwordHash,
          organization: 'JUST System',
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (createError) {
        return res.status(500).json({
          error: 'Failed to create admin user',
          details: createError.message
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Admin user created successfully',
        admin: {
          id: newAdmin.id,
          email: newAdmin.email,
          full_name: newAdmin.full_name,
          role: newAdmin.role,
          status: newAdmin.status,
          email_verified: newAdmin.email_verified
        },
        credentials: {
          email: 'admin@just-app.ng',
          password: 'admin123456'
        }
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
