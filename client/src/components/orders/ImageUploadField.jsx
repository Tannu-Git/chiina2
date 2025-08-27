import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Image as ImageIcon,
  X,
  Eye,
  Download,
  Camera,
  FileImage,
  Trash2,
  ZoomIn,
  RotateCw,
  Crop
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import axios from 'axios'
import toast from 'react-hot-toast'

const ImageUploadField = ({ value, onChange, maxFiles = 3, maxSize = 5 * 1024 * 1024 }) => {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const images = Array.isArray(value) ? value : value ? [value] : []
  
  // Debug logging
  console.log('ImageUploadField value:', value)
  console.log('ImageUploadField images:', images)

  // Handle file selection
  const handleFileSelect = async (files) => {
    const fileArray = Array.from(files)
    
    // Validate files
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        return false
      }
      
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`)
        return false
      }
      
      return true
    })

    if (validFiles.length === 0) return

    if (images.length + validFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed`)
      return
    }

    try {
      setUploading(true)
      
      // Upload files individually and collect results
      const uploadResults = []
      const uploadErrors = []
      
      for (const file of validFiles) {
        try {
          const uploadedImage = await uploadFile(file)
          uploadResults.push(uploadedImage)
        } catch (error) {
          uploadErrors.push(error)
          console.error(`Failed to upload ${file.name}:`, error)
        }
      }
      
      // Update state with successful uploads
      if (uploadResults.length > 0) {
        const newImages = [...images, ...uploadResults]
        onChange(maxFiles === 1 ? newImages[0] : newImages)
        
        if (uploadResults.length === validFiles.length) {
          toast.success(`${uploadResults.length} image(s) uploaded successfully`)
        } else {
          toast.success(`${uploadResults.length} of ${validFiles.length} images uploaded successfully`)
        }
      }
      
      // Show errors for failed uploads
      if (uploadErrors.length > 0) {
        uploadErrors.forEach(error => {
          toast.error(error.message || `Failed to upload ${error.fileName || 'file'}`)
        })
      }
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  // Upload single file
  const uploadFile = async (file) => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('type', 'order-item')

    try {
      const response = await axios.post('/api/upload/image', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout
      })
      
      // Construct full URL for the image - prefer server's fullUrl if available
      const baseURL = axios.defaults.baseURL || 'http://localhost:5001'
      const fullImageURL = response.data.fullUrl ||
        (response.data.url.startsWith('http') 
          ? response.data.url 
          : `${baseURL}${response.data.url}`)
      
      console.log('Upload response:', response.data)
      console.log('Base URL:', baseURL)
      console.log('Constructed image URL:', fullImageURL)
      
      return {
        id: Date.now() + Math.random(),
        url: fullImageURL,
        filename: response.data.filename || file.name,
        originalName: response.data.originalName || file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        publicId: response.data.publicId
      }
    } catch (error) {
      console.error('File upload error:', error)
      
      // Handle different error types
      let errorMessage = 'Failed to upload file'
      
      if (error.response?.data) {
        const { data } = error.response
        if (data.message) {
          errorMessage = data.message
        } else if (data.error) {
          errorMessage = data.error
        }
        
        // Handle specific error codes
        switch (error.response.status) {
          case 400:
            errorMessage = `Upload Error: ${data.message || 'Invalid file or format'}`
            break
          case 401:
            errorMessage = 'Authentication required. Please log in again.'
            break
          case 413:
            errorMessage = 'File too large. Maximum size is 10MB.'
            break
          case 415:
            errorMessage = 'File type not supported. Please use JPG, PNG, GIF, or PDF files.'
            break
          case 429:
            errorMessage = 'Too many upload attempts. Please try again later.'
            break
          case 500:
            errorMessage = 'Server error. Please try again later.'
            break
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. Please try again with a smaller file.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      // Create a specific error for this file
      const fileError = new Error(`${file.name}: ${errorMessage}`)
      fileError.fileName = file.name
      fileError.originalError = error
      
      throw fileError
    }
  }

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }

  // Remove image
  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index)
    onChange(maxFiles === 1 ? null : newImages)
  }

  // Preview image
  const previewImageHandler = (image) => {
    setPreviewImage(image)
    setShowPreview(true)
  }

  // Download image
  const downloadImage = (image) => {
    const link = document.createElement('a')
    link.href = image.url
    link.download = image.filename || 'image.jpg'
    link.click()
  }

  // Camera capture (mobile)
  const captureFromCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click()
    }
  }

  const ImagePreview = ({ image, index }) => {
    const [imageError, setImageError] = useState(false)
    
    const handleImageError = (e) => {
      console.error('Image failed to load:', image.url)
      setImageError(true)
    }

    const handleImageLoad = () => {
      console.log('Image loaded successfully:', image.url)
      setImageError(false)
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className="relative group bg-stone-100 rounded-lg overflow-hidden aspect-square"
      >
        {imageError ? (
          <div className="w-full h-full flex items-center justify-center bg-stone-200">
            <div className="text-center">
              <ImageIcon className="h-8 w-8 text-stone-400 mx-auto mb-2" />
              <p className="text-xs text-stone-500">Failed to load image</p>
              <p className="text-xs text-stone-400 truncate">{image.filename}</p>
            </div>
          </div>
        ) : (
          <img
            src={image.url}
            alt={image.filename}
            className="w-full h-full object-cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => previewImageHandler(image)}
              className="text-white hover:bg-white/20"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => downloadImage(image)}
              className="text-white hover:bg-white/20"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeImage(index)}
              className="text-white hover:bg-red-500/50"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* File info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <p className="text-white text-xs truncate">{image.filename}</p>
          <p className="text-white/70 text-xs">
            {Math.round(image.size / 1024)}KB
          </p>
          {imageError && (
            <p className="text-red-300 text-xs">Load error</p>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-4 transition-all duration-200 ${
          dragOver
            ? 'border-amber-500 bg-amber-50'
            : 'border-stone-300 hover:border-stone-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {uploading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
              <p className="text-sm text-stone-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <ImageIcon className="h-8 w-8 text-stone-400" />
              <div className="flex space-x-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= maxFiles}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload
                </Button>
                
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={captureFromCamera}
                  disabled={images.length >= maxFiles}
                >
                  <Camera className="h-3 w-3 mr-1" />
                  Camera
                </Button>
              </div>
              <p className="text-xs text-stone-500">
                Drag & drop or click to upload ({images.length}/{maxFiles})
              </p>
            </div>
          )}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={maxFiles > 1}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className={`grid gap-2 ${
          maxFiles === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'
        }`}>
          <AnimatePresence>
            {images.map((image, index) => (
              <ImagePreview key={image.id || index} image={image} index={index} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Image Preview Modal */}
      <AnimatePresence>
        {showPreview && previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="font-medium">{previewImage.filename}</h3>
                  <p className="text-sm text-stone-500">
                    {Math.round(previewImage.size / 1024)}KB • 
                    Uploaded {new Date(previewImage.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadImage(previewImage)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPreview(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Image */}
              <div className="p-4">
                <img
                  src={previewImage.url}
                  alt={previewImage.filename}
                  className="max-w-full max-h-[70vh] object-contain mx-auto"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-4 border-t bg-stone-50">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    <FileImage className="h-3 w-3 mr-1" />
                    Image
                  </Badge>
                </div>
                
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <RotateCw className="h-3 w-3 mr-1" />
                    Rotate
                  </Button>
                  <Button size="sm" variant="outline">
                    <Crop className="h-3 w-3 mr-1" />
                    Crop
                  </Button>
                  <Button size="sm" variant="outline">
                    <ZoomIn className="h-3 w-3 mr-1" />
                    Zoom
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ImageUploadField
