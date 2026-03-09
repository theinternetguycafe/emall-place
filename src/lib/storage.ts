import { supabase } from './supabase'

/**
 * Convert HEIC/HEIF images to JPEG for cross-browser compatibility
 * iPhone/Safari uploads often come as HEIC which many browsers can't display
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  // If not HEIC/HEIF, return as-is
  if (!file.type.includes('heic') && !file.type.includes('heif') && file.name.toLowerCase().split('.').pop() !== 'heic') {
    console.log('[Storage] File is not HEIC, using as-is:', file.type, file.name)
    return file
  }

  console.log('[Storage] Detected HEIC/HEIF, attempting conversion to JPEG...')
  
  try {
    // Convert using canvas
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Failed to load HEIC image'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read HEIC file'))
      reader.readAsDataURL(file)
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')
    
    ctx.drawImage(img, 0, 0)
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas to blob conversion failed'))
        // Create new File from blob
        const converted = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' })
        console.log('[Storage] HEIC converted to JPEG successfully')
        resolve(converted)
      }, 'image/jpeg', 0.9)
    })
  } catch (err) {
    console.warn('[Storage] HEIC conversion failed, falling back to original:', err)
    // If conversion fails, return original and try to upload as-is
    return file
  }
}

export async function uploadProductImage(file: File): Promise<string | null> {
  const DEBUG = import.meta.env.DEV
  console.log('[Storage] uploadProductImage START:', { name: file.name, type: file.type, size: file.size })

  // Validate file
  if (!file.type.startsWith('image/')) {
    console.error('[Storage] Invalid file type (must be image):', file.type)
    return null
  }

  if (file.size > 10 * 1024 * 1024) {
    console.error('[Storage] File too large (max 10MB):', file.size)
    return null
  }

  try {
    // Convert HEIC to JPEG if needed
    let uploadFile = file
    if (file.type.includes('heic') || file.type.includes('heif') || file.name.toLowerCase().endsWith('.heic')) {
      uploadFile = await convertHeicToJpeg(file)
    }

    // Get extension from file, fallback to 'jpg'
    let fileExt = uploadFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    
    // Sanitize extension to known image types
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
      fileExt = 'jpg'
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `products/${fileName}`

    console.log('[Storage] Uploading to:', filePath, { contentType: uploadFile.type })

    const { error } = await supabase.storage
      .from('marketplace')
      .upload(filePath, uploadFile, {
        contentType: uploadFile.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('[Storage] Upload failed:', error)
      return null
    }

    const { data } = supabase.storage
      .from('marketplace')
      .getPublicUrl(filePath)

    const publicUrl = data.publicUrl
    console.log('[Storage] Upload succeeded:', { filePath, publicUrl })
    return publicUrl
  } catch (err: any) {
    console.error('[Storage] Upload error (exception):', err.message || err)
    return null
  }
}
