import React from 'react'
import { BadgeCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

interface SellerBadgeProps {
  storeName: string
  storeSlug?: string
  isVerified?: boolean
  logoUrl?: string
  size?: 'sm' | 'md'
}

export default function SellerBadge({
  storeName,
  storeSlug,
  isVerified = false,
  logoUrl,
  size = 'sm',
}: SellerBadgeProps) {
  const content = (
    <div className="flex items-center gap-1.5 group/seller">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={storeName}
          className={`rounded-full object-cover border border-stone-100 flex-shrink-0 ${size === 'md' ? 'w-6 h-6' : 'w-4 h-4'}`}
        />
      ) : (
        <div className={`rounded-full bg-stone-200 flex-shrink-0 ${size === 'md' ? 'w-6 h-6' : 'w-4 h-4'}`} />
      )}
      <span className={`font-semibold text-stone-500 truncate group-hover/seller:text-slate-900 transition-colors ${size === 'md' ? 'text-sm' : 'text-xs'}`}>
        {storeName}
      </span>
      {isVerified && (
        <BadgeCheck
          size={size === 'md' ? 15 : 13}
          className="text-emerald-500 flex-shrink-0"
          aria-label="Verified seller"
        />
      )}
    </div>
  )

  if (storeSlug) {
    return <Link to={`/store/${storeSlug}`}>{content}</Link>
  }
  return content
}