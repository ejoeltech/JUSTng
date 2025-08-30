import { useState, useRef, useCallback } from 'react'
import { Camera, X, Upload, Image as ImageIcon, AlertCircle, Cloud, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import fileUploadService from '../services/fileUploadService'

const PhotoUpload = ({ 
  onPhotosSelected, 
  maxPhotos = 5, 
  maxSizeMB = 10, 
  userId, 
  incidentId,
  onUploadProgress,
  showUploadButton = true 
}) => {
  const [photos, setPhotos] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const fileInputRef = useRef(null)

  // Validate file type and size
  const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSizeBytes = maxSizeMB * 1024 * 1024

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select only JPEG, PNG, or WebP images')
      return false
    }

    if (file.size > maxSizeBytes) {
      toast.error(`File size must be less than ${maxSizeMB}MB`)
      return false
    }

    return true
  }

  // Compress image to reduce file size
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions (max 1200px width/height)
        const maxDimension = 1200
        let { width, height } = img

        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width
            width = maxDimension
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height
            height = maxDimension
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
          0.8 // Quality 80%
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Handle file selection
  const handleFileSelect = async (files) => {
    if (photos.length + files.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`)
      return
    }

    setIsUploading(true)
    const newPhotos = []

    try {
      for (const file of files) {
        if (!validateFile(file)) continue

        // Compress the image
        const compressedFile = await compressImage(file)
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(compressedFile)
        
        newPhotos.push({
          file: compressedFile,
          preview: previewUrl,
          name: file.name,
          size: compressedFile.size,
          type: compressedFile.type,
          isUploaded: false
        })
      }

      const updatedPhotos = [...photos, ...newPhotos]
      setPhotos(updatedPhotos)
      onPhotosSelected(updatedPhotos)
      
      if (newPhotos.length > 0) {
        toast.success(`${newPhotos.length} photo(s) added successfully`)
      }
    } catch (error) {
      console.error('Error processing photos:', error)
      toast.error('Error processing photos. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // Upload files to Supabase storage
  const handleUploadToStorage = async () => {
    if (!userId || !incidentId) {
      toast.error('User ID and Incident ID are required for upload')
      return
    }

    if (photos.length === 0) {
      toast.error('No photos to upload')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Prepare files for upload
      const filesToUpload = photos.map(photo => photo.file)
      
      // Upload files using the service
      const result = await fileUploadService.uploadMultipleFiles(
        filesToUpload, 
        userId, 
        incidentId,
        (progress, current, total) => {
          setUploadProgress(progress)
          if (onUploadProgress) {
            onUploadProgress(progress, current, total)
          }
        }
      )

      if (result.success) {
        // Update photos with upload status
        const updatedPhotos = photos.map((photo, index) => ({
          ...photo,
          isUploaded: true,
          uploadResult: result.results[index]
        }))

        setPhotos(updatedPhotos)
        setUploadedFiles(result.results)
        
        toast.success(`Successfully uploaded ${result.successfulUploads} file(s)`)
        
        // Call callback with uploaded files
        if (onPhotosSelected) {
          onPhotosSelected(updatedPhotos, result.results)
        }
      } else {
        toast.error(`Upload failed: ${result.failedUploads} file(s) failed`)
      }

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFileSelect(files)
  }, [photos])

  // Remove photo
  const removePhoto = (index) => {
    const updatedPhotos = photos.filter((_, i) => i !== index)
    setPhotos(updatedPhotos)
    onPhotosSelected(updatedPhotos)
    
    // Revoke preview URL to free memory
    URL.revokeObjectURL(photos[index].preview)
    
    toast.success('Photo removed')
  }

  // Handle file input change
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files)
    handleFileSelect(files)
    
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragOver ? 'Drop photos here' : 'Upload Photos'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop photos here, or click to browse
            </p>
          </div>

          <div className="text-xs text-gray-400 space-y-1">
            <p>Supported formats: JPEG, PNG, WebP</p>
            <p>Maximum size: {maxSizeMB}MB per photo</p>
            <p>Maximum photos: {maxPhotos}</p>
          </div>

                     <button
             type="button"
             onClick={() => fileInputRef.current?.click()}
             disabled={isUploading}
             className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isUploading ? 'Processing...' : 'Browse Photos'}
           </button>

           {/* Upload to Storage Button */}
           {showUploadButton && userId && incidentId && photos.length > 0 && (
             <button
               type="button"
               onClick={handleUploadToStorage}
               disabled={isUploading}
               className="mt-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
             >
               {isUploading ? (
                 <>
                   <Cloud className="h-4 w-4 animate-pulse" />
                   <span>Uploading... {Math.round(uploadProgress)}%</span>
                 </>
               ) : (
                 <>
                   <Cloud className="h-4 w-4" />
                   <span>Upload to Storage</span>
                 </>
               )}
             </button>
           )}

           {/* Upload Progress Bar */}
           {isUploading && uploadProgress > 0 && (
             <div className="mt-3">
               <div className="w-full bg-gray-200 rounded-full h-2">
                 <div 
                   className="bg-green-600 h-2 rounded-full transition-all duration-300"
                   style={{ width: `${uploadProgress}%` }}
                 />
               </div>
               <p className="text-xs text-gray-600 mt-1 text-center">
                 Uploading... {Math.round(uploadProgress)}%
               </p>
             </div>
           )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Photo Preview Grid */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">
              Selected Photos ({photos.length}/{maxPhotos})
            </h4>
            <button
              type="button"
              onClick={() => {
                setPhotos([])
                onPhotosSelected([])
                photos.forEach(photo => URL.revokeObjectURL(photo.preview))
                toast.success('All photos removed')
              }}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={photo.preview}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Remove button overlay */}
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Photo info */}
                                 <div className="mt-2 text-xs text-gray-600">
                   <p className="truncate font-medium">{photo.name}</p>
                   <p>{formatFileSize(photo.size)}</p>
                   {photo.isUploaded && (
                     <div className="flex items-center space-x-1 text-green-600 mt-1">
                       <CheckCircle className="h-3 w-3" />
                       <span>Uploaded</span>
                     </div>
                   )}
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Photo Tips:</p>
            <ul className="mt-1 space-y-1">
              <li>• Ensure good lighting for clear photos</li>
              <li>• Include relevant details and context</li>
              <li>• Photos are automatically compressed to save space</li>
              <li>• You can add up to {maxPhotos} photos per incident</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotoUpload
