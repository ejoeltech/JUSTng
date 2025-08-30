// File Upload Service for Supabase Storage
import { createClient } from '@supabase/supabase-js'

class FileUploadService {
  constructor() {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
    
    // Only initialize Supabase if we have the required environment variables
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey)
    } else {
      console.warn('Supabase environment variables not found. File upload will work in local mode.')
      this.supabase = null
    }
    
    this.maxFileSize = 10 * 1024 * 1024 // 10MB
    this.allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    this.allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv']
    this.maxImageDimension = 1200 // Max width/height for images
    this.imageQuality = 0.8 // JPEG quality
    this.uploadProgress = 0
    this.isUploading = false
  }

  // Validate file type and size
  validateFile(file) {
    const errors = []
    
    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size must be less than ${this.formatFileSize(this.maxFileSize)}`)
    }
    
    // Check file type
    const isImage = this.allowedImageTypes.includes(file.type)
    const isVideo = this.allowedVideoTypes.includes(file.type)
    
    if (!isImage && !isVideo) {
      errors.push('File type not supported. Please use JPEG, PNG, WebP, MP4, AVI, MOV, or WMV files.')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      isImage,
      isVideo
    }
  }

  // Compress image to reduce file size
  async compressImage(file) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > height) {
          if (width > this.maxImageDimension) {
            height = (height * this.maxImageDimension) / width
            width = this.maxImageDimension
          }
        } else {
          if (height > this.maxImageDimension) {
            width = (width * this.maxImageDimension) / height
            height = this.maxImageDimension
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          this.imageQuality
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Generate unique filename
  generateFilename(originalName, userId, incidentId) {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = originalName.split('.').pop()
    return `${userId}_${incidentId}_${timestamp}_${randomString}.${extension}`
  }

  // Upload single file to Supabase storage
  async uploadFile(file, userId, incidentId, onProgress) {
    try {
      // Check if Supabase is available
      if (!this.supabase) {
        // Return mock success for local development
        const filename = this.generateFilename(file.name, userId, incidentId)
        return {
          success: true,
          filename,
          filePath: `local/${filename}`,
          publicUrl: URL.createObjectURL(file),
          size: file.size,
          type: file.type,
          originalName: file.name,
          message: 'File uploaded locally (Supabase not configured)'
        }
      }

      // Validate file
      const validation = this.validateFile(file)
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '))
      }

      // Compress image if needed
      let fileToUpload = file
      if (validation.isImage) {
        fileToUpload = await this.compressImage(file)
      }

      // Generate filename
      const filename = this.generateFilename(file.name, userId, incidentId)
      const filePath = `incidents/${incidentId}/${filename}`

      // Upload to Supabase storage
      const { data, error } = await this.supabase.storage
        .from('incident-media')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('incident-media')
        .getPublicUrl(filePath)

      return {
        success: true,
        filename,
        filePath,
        publicUrl: urlData.publicUrl,
        size: fileToUpload.size,
        type: fileToUpload.type,
        originalName: file.name
      }

    } catch (error) {
      console.error('File upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(files, userId, incidentId, onProgress) {
    this.isUploading = true
    this.uploadProgress = 0
    
    const results = []
    const totalFiles = files.length
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Update progress
      this.uploadProgress = ((i + 1) / totalFiles) * 100
      if (onProgress) {
        onProgress(this.uploadProgress, i + 1, totalFiles)
      }
      
      // Upload file
      const result = await this.uploadFile(file, userId, incidentId)
      results.push(result)
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    this.isUploading = false
    this.uploadProgress = 0
    
    return {
      success: results.every(r => r.success),
      results,
      totalFiles,
      successfulUploads: results.filter(r => r.success).length,
      failedUploads: results.filter(r => !r.success).length
    }
  }

  // Delete file from storage
  async deleteFile(filePath) {
    try {
      if (!this.supabase) {
        console.warn('Cannot delete file - Supabase not configured')
        return { success: true, message: 'File delete skipped (local mode)' }
      }

      const { error } = await this.supabase.storage
        .from('incident-media')
        .remove([filePath])

      if (error) {
        throw new Error(`Delete failed: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      console.error('File deletion error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Get file info from storage
  async getFileInfo(filePath) {
    try {
      if (!this.supabase) {
        return { success: false, error: 'Supabase not configured' }
      }

      const { data, error } = await this.supabase.storage
        .from('incident-media')
        .list(filePath.split('/').slice(0, -1).join('/'))

      if (error) {
        throw new Error(`Failed to get file info: ${error.message}`)
      }

      return { success: true, data }
    } catch (error) {
      console.error('Get file info error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Download file
  async downloadFile(filePath, filename) {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not configured - cannot download files')
      }

      const { data, error } = await this.supabase.storage
        .from('incident-media')
        .download(filePath)

      if (error) {
        throw new Error(`Download failed: ${error.message}`)
      }

      // Create download link
      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      return { success: true }
    } catch (error) {
      console.error('File download error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Get storage usage statistics
  async getStorageStats() {
    try {
      if (!this.supabase) {
        return { totalFiles: 0, totalSize: 0, message: 'Supabase not configured' }
      }

      const { data, error } = await this.supabase.storage
        .from('incident-media')
        .list('', { limit: 1000 })

      if (error) {
        throw new Error(`Failed to get storage stats: ${error.message}`)
      }

      const totalFiles = data.length
      const totalSize = data.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
      const fileTypes = data.reduce((types, file) => {
        const type = file.metadata?.mimetype || 'unknown'
        types[type] = (types[type] || 0) + 1
        return types
      }, {})

      return {
        success: true,
        totalFiles,
        totalSize: this.formatFileSize(totalSize),
        fileTypes
      }
    } catch (error) {
      console.error('Get storage stats error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Clean up old files (older than specified days)
  async cleanupOldFiles(daysOld = 30) {
    try {
      if (!this.supabase) {
        return { deletedCount: 0, message: 'Supabase not configured - cleanup skipped' }
      }

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { data, error } = await this.supabase.storage
        .from('incident-media')
        .list('', { limit: 1000 })

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`)
      }

      const oldFiles = data.filter(file => {
        const fileDate = new Date(file.created_at)
        return fileDate < cutoffDate
      })

      if (oldFiles.length === 0) {
        return { success: true, deletedCount: 0, message: 'No old files to clean up' }
      }

      const filePaths = oldFiles.map(file => file.name)
      const { error: deleteError } = await this.supabase.storage
        .from('incident-media')
        .remove(filePaths)

      if (deleteError) {
        throw new Error(`Cleanup failed: ${deleteError.message}`)
      }

      return {
        success: true,
        deletedCount: oldFiles.length,
        message: `Successfully deleted ${oldFiles.length} old files`
      }
    } catch (error) {
      console.error('Cleanup error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get upload progress
  getUploadProgress() {
    return {
      progress: this.uploadProgress,
      isUploading: this.isUploading
    }
  }

  // Reset upload state
  resetUploadState() {
    this.uploadProgress = 0
    this.isUploading = false
  }

  // Create thumbnail for video files
  async createVideoThumbnail(videoFile) {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      video.onloadedmetadata = () => {
        // Set canvas size
        canvas.width = 200
        canvas.height = 150

        // Seek to 1 second and capture frame
        video.currentTime = 1
      }

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob((blob) => {
          const thumbnailFile = new File([blob], 'thumbnail.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(thumbnailFile)
        }, 'image/jpeg', 0.8)
      }

      video.src = URL.createObjectURL(videoFile)
    })
  }

  // Validate and prepare files for upload
  async prepareFilesForUpload(files, userId, incidentId) {
    const preparedFiles = []
    const errors = []

    for (const file of files) {
      const validation = this.validateFile(file)
      
      if (!validation.isValid) {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`)
        continue
      }

      let preparedFile = file
      
      // Compress images
      if (validation.isImage) {
        preparedFile = await this.compressImage(file)
      }

      // Create video thumbnail
      if (validation.isVideo) {
        try {
          const thumbnail = await this.createVideoThumbnail(file)
          preparedFiles.push({
            file: thumbnail,
            type: 'thumbnail',
            originalFile: file.name
          })
        } catch (error) {
          console.warn(`Failed to create thumbnail for ${file.name}:`, error)
        }
      }

      preparedFiles.push({
        file: preparedFile,
        type: validation.isImage ? 'image' : 'video',
        originalFile: file.name
      })
    }

    return {
      files: preparedFiles,
      errors,
      hasErrors: errors.length > 0
    }
  }
}

// Create singleton instance
const fileUploadService = new FileUploadService()

export default fileUploadService
