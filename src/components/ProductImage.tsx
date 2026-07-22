import React, { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface ProductImageProps {
  src?: string
  alt: string
  className?: string
  imgClassName?: string
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
  transformOptions?: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png' | 'avif'
  }
}

const SUPABASE_STORAGE_URL_BASE = '/storage/v1/object/public/'
const SUPABASE_RENDER_URL_BASE = '/storage/v1/render/image/public/'

function getTransformedUrl(url: string, options?: ProductImageProps['transformOptions']): string {
  if (!options || !url.includes(SUPABASE_STORAGE_URL_BASE)) return url
  if (url.includes('width=') || url.includes('height=')) return url
  const transformBaseUrl = url.replace(SUPABASE_STORAGE_URL_BASE, SUPABASE_RENDER_URL_BASE)
  const params = new URLSearchParams()
  if (options.width) params.append('width', options.width.toString())
  if (options.height) params.append('height', options.height.toString())
  if (options.quality) params.append('quality', options.quality.toString())
  if (options.format) params.append('format', options.format)
  return `${transformBaseUrl}?${params.toString()}`
}

export default function ProductImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  loading = 'lazy',
  fetchPriority,
  transformOptions,
}: ProductImageProps) {
  const [imgError, setImgError] = useState(false)
  const [imgLoading, setImgLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  if (!src || imgError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-[#FAFAF8] text-stone-300 overflow-hidden ${className}`}>
        <ImageOff className="h-10 w-10 mb-2 opacity-40" />
        <span className="text-xs font-bold uppercase tracking-widest opacity-40">No Image</span>
      </div>
    )
  }

  const imageUrl = (!usingFallback && transformOptions) ? getTransformedUrl(src, transformOptions) : src

  return (
    <div className={`relative overflow-hidden bg-[#FAFAF8] ${className}`}>
      {/* Skeleton shimmer while loading */}
      {imgLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-stone-100 via-stone-50 to-stone-100 animate-pulse motion-reduce:animate-none z-10" />
      )}
      <img
        src={imageUrl}
        alt={alt}
        loading={loading}
        {...(fetchPriority ? { fetchPriority } : {})}
        className={`w-full h-full object-cover object-center transition-opacity duration-300 ${imgLoading ? 'opacity-0' : 'opacity-100'} ${imgClassName}`}
        onLoad={() => setImgLoading(false)}
        onError={() => {
          if (!usingFallback && transformOptions) {
            setUsingFallback(true)
          } else {
            setImgError(true)
            setImgLoading(false)
          }
        }}
      />
    </div>
  )
}