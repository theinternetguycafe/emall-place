import React, { useState } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'

interface ProductImageProps {
  src?: string
  alt: string
  className?: string
}

export default function ProductImage({ src, alt, className = "" }: ProductImageProps) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  if (!src || error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-stone-100 text-stone-400 ${className}`}>
        <ImageOff className="h-10 w-10 mb-2 opacity-20" />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Image Unavailable</span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-stone-100 ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 z-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-900" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => {
          setLoading(false)
          console.log('[ProductImage] Image loaded:', src)
        }}
        onError={() => {
          setError(true)
          setLoading(false)
          console.error('[ProductImage] Image failed to load:', { src, alt })
        }}
      />
    </div>
  )
}
