import React, { useState } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'

interface ProductImageProps {
  src?: string
  alt: string
  className?: string
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
  if (!options || !url.includes(SUPABASE_STORAGE_URL_BASE)) {
    return url;
  }

  // Ensure we don't double up on transform params if somehow already added
  if (url.includes('width=') || url.includes('height=')) {
    return url;
  }

  // Re-route to the transform endpoint
  const transformBaseUrl = url.replace(
    SUPABASE_STORAGE_URL_BASE,
    SUPABASE_RENDER_URL_BASE
  );

  const params = new URLSearchParams();
  if (options.width) params.append('width', options.width.toString());
  if (options.height) params.append('height', options.height.toString());
  if (options.quality) params.append('quality', options.quality.toString());
  if (options.format) params.append('format', options.format);

  return `${transformBaseUrl}?${params.toString()}`;
}

export default function ProductImage({ src, alt, className = "", transformOptions }: ProductImageProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  if (!src || error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-stone-100 text-stone-400 ${className}`}>
        <ImageOff className="h-10 w-10 mb-2 opacity-20" />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Image Unavailable</span>
      </div>
    )
  }

  // Calculate the URL to use (transformed or original fallback)
  const imageUrl = (!usingFallback && transformOptions) ? getTransformedUrl(src, transformOptions) : src;

  return (
    <div className={`relative overflow-hidden bg-stone-100 ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 z-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => {
          setLoading(false)
          console.log('[ProductImage] Image loaded:', imageUrl)
        }}
        onError={() => {
          if (!usingFallback && transformOptions) {
            console.log('[ProductImage] Transform failed, falling back to original:', src)
            setUsingFallback(true)
          } else {
            setError(true)
            setLoading(false)
            console.error('[ProductImage] Image failed to load completely:', { src, alt })
          }
        }}
      />
    </div>
  )
}
