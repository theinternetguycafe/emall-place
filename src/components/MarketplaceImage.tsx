import React, { useState } from 'react'
import { ImageOff } from 'lucide-react'

export type ImageMode = 'marketplace' | 'hero' | 'banner' | 'thumbnail' | 'gallery' | 'avatar'
export type ImageVariant = 'card' | 'thumbnail' | 'gallery' | 'hero' | 'avatar' | 'banner'

export interface MarketplaceImageProps {
  src: string | null | undefined
  alt?: string
  className?: string
  imgClassName?: string
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
  mode?: ImageMode
  variant?: ImageVariant
  transformOptions?: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png' | 'avif'
    resize?: 'contain' | 'cover' | 'fill'
  }
}

// Map variants to default classNames for aspect ratio and rounding
const variantClasses: Record<ImageVariant, string> = {
  card: 'aspect-[4/5] rounded-2xl',
  thumbnail: 'aspect-square rounded-xl',
  gallery: 'aspect-square rounded-3xl',
  hero: 'aspect-video rounded-3xl',
  banner: 'aspect-[3/1] rounded-none',
  avatar: 'aspect-square rounded-full'
}

// Map modes to object-fit, padding, and background strategies
const modeConfig: Record<ImageMode, { fit: string, padding: string, bg: string }> = {
  marketplace: { fit: 'object-contain', padding: 'p-2 md:p-4', bg: 'bg-gradient-to-br from-[#FAFAF8] to-[#F7F6F3]' },
  thumbnail: { fit: 'object-contain', padding: 'p-1', bg: 'bg-gradient-to-br from-[#FAFAF8] to-[#F7F6F3]' },
  gallery: { fit: 'object-contain', padding: 'p-2', bg: 'bg-gradient-to-br from-[#FAFAF8] to-[#F7F6F3]' },
  hero: { fit: 'object-cover', padding: 'p-0', bg: 'bg-slate-900' },
  banner: { fit: 'object-cover', padding: 'p-0', bg: 'bg-slate-100' },
  avatar: { fit: 'object-cover', padding: 'p-0', bg: 'bg-slate-100' }
}

const SUPABASE_STORAGE_URL_BASE = '/storage/v1/object/public/'
const SUPABASE_RENDER_URL_BASE = '/storage/v1/render/image/public/'

function getTransformedUrl(url: string, options?: MarketplaceImageProps['transformOptions'], mode?: ImageMode): string {
  if (!options || !url.includes(SUPABASE_STORAGE_URL_BASE)) return url
  if (url.includes('width=') || url.includes('height=')) return url
  
  const transformBaseUrl = url.replace(SUPABASE_STORAGE_URL_BASE, SUPABASE_RENDER_URL_BASE)
  const params = new URLSearchParams()
  
  if (options.width) params.append('width', options.width.toString())
  if (options.height) params.append('height', options.height.toString())
  if (options.quality) params.append('quality', options.quality.toString())
  if (options.format) params.append('format', options.format)
  
  // Intelligent resize based on mode if not explicitly provided
  let resizeBehavior = options.resize
  if (!resizeBehavior) {
    if (mode === 'marketplace' || mode === 'thumbnail' || mode === 'gallery') {
      resizeBehavior = 'contain'
    } else {
      resizeBehavior = 'cover'
    }
  }
  
  if (resizeBehavior) params.append('resize', resizeBehavior)
  
  return `${transformBaseUrl}?${params.toString()}`
}

export default function MarketplaceImage({
  src,
  alt,
  className = '',
  imgClassName = '',
  loading = 'lazy',
  fetchPriority,
  mode = 'marketplace',
  variant,
  transformOptions
}: MarketplaceImageProps) {
  const [imgError, setImgError] = useState(false)
  const [imgLoading, setImgLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  // Use variant classes if provided, else rely on custom className
  const wrapperClasses = variant ? variantClasses[variant] : ''
  const config = modeConfig[mode]

  if (!src || imgError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-stone-100 text-stone-400 ${wrapperClasses} ${className}`}>
        <ImageOff className="h-10 w-10 mb-2 opacity-40" />
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image</span>
      </div>
    )
  }

  const imageUrl = (!usingFallback && transformOptions) ? getTransformedUrl(src, transformOptions, mode) : src

  return (
    <div className={`relative overflow-hidden ${config.bg} ${wrapperClasses} ${className}`}>
      {/* Skeleton shimmer while loading */}
      {imgLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-stone-100/50 via-stone-50/50 to-stone-100/50 animate-pulse z-10" />
      )}
      
      <div className={`absolute inset-0 flex items-center justify-center ${config.padding}`}>
        <img
          src={imageUrl}
          srcSet={transformOptions ? undefined : `${imageUrl}?width=400 400w, ${imageUrl}?width=800 800w, ${imageUrl}?width=1200 1200w`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          alt={alt || "Product image"}
          loading={loading}
          {...(fetchPriority ? { fetchPriority } : {})}
          className={`w-full h-full ${config.fit} object-center transition-opacity duration-500 ${imgLoading ? 'opacity-0' : 'opacity-100'} ${imgClassName}`}
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
    </div>
  )
}