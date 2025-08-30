// Incident File Upload API Endpoint
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST method is allowed' 
    })
  }

  try {
    // Check authorization
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authorization token required'
      })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify JWT token (placeholder - implement your JWT verification)
    // const decoded = jwt.verify(token, process.env.JWT_SECRET)
    // const userId = decoded.userId
    
    // For now, extract user ID from request body
    const { userId, incidentId, files } = req.body

    if (!userId || !incidentId || !files || !Array.isArray(files)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'userId, incidentId, and files array are required'
      })
    }

    // Validate incident exists
    const { data: incident, error: incidentError } = await supabase
      .from('incidents')
      .select('id, status')
      .eq('id', incidentId)
      .single()

    if (incidentError || !incident) {
      return res.status(404).json({
        success: false,
        error: 'INCIDENT_NOT_FOUND',
        message: 'Incident not found'
      })
    }

    // Check if user has permission to upload to this incident
    // This would typically check if user is the reporter or has admin access
    // For now, we'll allow any authenticated user

    const uploadResults = []
    const errors = []

    // Process each file
    for (const fileData of files) {
      try {
        const { filename, content, mimeType, size } = fileData

        // Validate file data
        if (!filename || !content || !mimeType || !size) {
          errors.push(`Invalid file data for ${filename || 'unknown'}`)
          continue
        }

        // Validate file size (10MB limit)
        if (size > 10 * 1024 * 1024) {
          errors.push(`${filename}: File size exceeds 10MB limit`)
          continue
        }

        // Validate file type
        const allowedTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'video/mp4', 'video/avi', 'video/mov', 'video/wmv'
        ]
        
        if (!allowedTypes.includes(mimeType)) {
          errors.push(`${filename}: File type not supported`)
          continue
        }

        // Convert base64 content to buffer
        const fileBuffer = Buffer.from(content, 'base64')
        
        // Generate unique file path
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        const extension = filename.split('.').pop()
        const uniqueFilename = `${userId}_${incidentId}_${timestamp}_${randomString}.${extension}`
        const filePath = `incidents/${incidentId}/${uniqueFilename}`

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('incident-media')
          .upload(filePath, fileBuffer, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          errors.push(`${filename}: Upload failed - ${uploadError.message}`)
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('incident-media')
          .getPublicUrl(filePath)

        // Save file metadata to database
        const { data: fileRecord, error: dbError } = await supabase
          .from('incident_files')
          .insert({
            incident_id: incidentId,
            filename: uniqueFilename,
            original_filename: filename,
            file_path: filePath,
            public_url: urlData.publicUrl,
            file_size: size,
            mime_type: mimeType,
            uploaded_by: userId,
            upload_date: new Date().toISOString()
          })
          .select()
          .single()

        if (dbError) {
          errors.push(`${filename}: Database save failed - ${dbError.message}`)
          continue
        }

        uploadResults.push({
          success: true,
          filename: uniqueFilename,
          originalFilename: filename,
          publicUrl: urlData.publicUrl,
          fileSize: size,
          mimeType,
          fileId: fileRecord.id
        })

      } catch (fileError) {
        console.error(`Error processing file ${fileData.filename}:`, fileError)
        errors.push(`${fileData.filename}: Processing error - ${fileError.message}`)
      }
    }

    // Update incident with file count
    if (uploadResults.length > 0) {
      await supabase
        .from('incidents')
        .update({ 
          media_count: (incident.media_count || 0) + uploadResults.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentId)
    }

    // Return results
    const success = uploadResults.length > 0
    const statusCode = success ? 200 : 400

    return res.status(statusCode).json({
      success,
      message: success 
        ? `Successfully uploaded ${uploadResults.length} file(s)`
        : 'No files were uploaded successfully',
      uploads: uploadResults,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: files.length,
        successful: uploadResults.length,
        failed: errors.length
      }
    })

  } catch (error) {
    console.error('File upload API error:', error)
    
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Internal server error occurred during file upload'
    })
  }
}
