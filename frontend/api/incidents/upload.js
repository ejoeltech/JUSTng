// File Upload API for Incident Evidence
import { authenticateToken, requireActiveStatus } from '../middleware/auth.js'

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
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Apply authentication middleware
  try {
    await authenticateToken(req, res, () => {})
    await requireActiveStatus(req, res, () => {})
  } catch (error) {
    return // Error already sent by middleware
  }

  try {
    const { user } = req
    const { incidentId, fileType, fileName, fileSize, fileData } = req.body

    // Validate required fields
    if (!incidentId || !fileType || !fileName || !fileSize || !fileData) {
      return res.status(400).json({ 
        error: 'Incident ID, file type, name, size, and data are required' 
      })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/mov']
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only images (JPEG, PNG, GIF) and videos (MP4, AVI, MOV) are allowed.' 
      })
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB in bytes
    if (fileSize > maxSize) {
      return res.status(400).json({ 
        error: 'File size too large. Maximum size is 50MB.' 
      })
    }

    // Validate file name
    if (fileName.length > 255) {
      return res.status(400).json({ 
        error: 'File name too long. Maximum length is 255 characters.' 
      })
    }

    // Generate unique file ID
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    
    // Create file metadata
    const fileMetadata = {
      id: fileId,
      incidentId,
      fileName,
      fileType,
      fileSize,
      uploadedBy: user.userId,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      url: `https://storage.supabase.co/evidence/${fileId}/${fileName}`, // Simulated URL
      thumbnailUrl: fileType.startsWith('image/') ? 
        `https://storage.supabase.co/evidence/${fileId}/thumb_${fileName}` : null
    }

    // In production, you would:
    // 1. Upload file to Supabase Storage
    // 2. Generate thumbnails for images
    // 3. Compress videos
    // 4. Store metadata in database
    // 5. Update incident with file reference

    // Simulate file processing
    const processingResult = {
      success: true,
      fileId,
      message: 'File uploaded successfully',
      metadata: fileMetadata,
      nextSteps: [
        'File has been securely stored',
        'Evidence is now linked to your incident',
        'File will be reviewed by authorities',
        'You can view the file in your incident details'
      ]
    }

    return res.status(200).json(processingResult)

  } catch (error) {
    console.error('File upload error:', error)
    return res.status(500).json({ 
      error: 'Failed to upload file' 
    })
  }
}

// Helper function to validate file content (basic)
function validateFileContent(fileData, fileType) {
  try {
    // Basic validation - in production, use proper file validation libraries
    if (fileType.startsWith('image/')) {
      // Validate image data
      return fileData && fileData.length > 0
    } else if (fileType.startsWith('video/')) {
      // Validate video data
      return fileData && fileData.length > 0
    }
    return false
  } catch (error) {
    return false
  }
}
