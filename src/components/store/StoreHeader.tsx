import React, { useEffect, useState } from 'react'
import { SellerStore } from '../../types'
import { Heart, MessageCircle, Star, MapPin, CheckCircle, Package, ChevronRight } from 'lucide-react'
import { Button } from '../ui/Button'

interface StoreHeaderProps {
  store: SellerStore
  productCount?: number
  isFollowing?: boolean
  onFollowClick?: () => void
  onContactClick?: () => void
  onViewPoliciesClick?: () => void
}

export default function StoreHeader({
  store,
  productCount = 0,
  isFollowing = false,
  onFollowClick,
  onContactClick,
  onViewPoliciesClick,
}: StoreHeaderProps) {
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 260)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-[1.75rem] border-2 border-stone-200 bg-gradient-to-br from-slate-100 to-stone-100 sm:h-32 sm:w-32">
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.store_name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-900 text-3xl font-black text-white sm:text-4xl">
                    {store.store_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                    {store.store_name}
                  </h1>
                  {store.status === 'active' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle className="h-4 w-4" />
                      Verified Store
                    </span>
                  )}
                </div>

                {store.tagline && (
                  <p className="max-w-2xl text-base font-medium text-stone-600 sm:text-lg">
                    {store.tagline}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-stone-600">
                  {store.average_rating ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${
                              index < Math.round(store.average_rating || 0)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-stone-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-slate-900">
                        {store.average_rating.toFixed(1)}
                      </span>
                      <span>
                        ({store.review_count || 0} review{store.review_count === 1 ? '' : 's'})
                      </span>
                    </div>
                  ) : (
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-stone-700">
                      New storefront
                    </span>
                  )}

                  {store.seller_location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{store.seller_location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>{productCount} item{productCount === 1 ? '' : 's'} in store</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-4 text-sm font-bold">
                  <button
                    type="button"
                    onClick={onViewPoliciesClick}
                    className="inline-flex items-center gap-1 text-slate-900 transition-colors hover:text-slate-600"
                  >
                    Visit Policies
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {store.seller_email && (
                    <a
                      href={`mailto:${store.seller_email}`}
                      className="text-stone-600 transition-colors hover:text-slate-900"
                    >
                      {store.seller_email}
                    </a>
                  )}
                </div>

                {store.announcement_text && (
                  <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
                    {store.announcement_text}
                  </div>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[220px]">
              <Button
                onClick={onFollowClick}
                variant={isFollowing ? 'outline' : 'primary'}
                className="flex items-center justify-center gap-2"
              >
                <Heart className={`h-4 w-4 ${isFollowing ? 'fill-current' : ''}`} />
                {isFollowing ? 'Following' : 'Follow Store'}
              </Button>
              <Button
                onClick={onContactClick}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Contact Seller
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isSticky && (
        <div className="fixed left-0 right-0 top-0 z-40 border-b border-stone-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-900">
                {store.logo_url ? (
                  <img
                    src={store.logo_url}
                    alt={store.store_name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-black text-white">
                    {store.store_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black tracking-tight text-slate-900">
                  {store.store_name}
                </h2>
                <p className="truncate text-xs text-stone-600">
                  {store.tagline || `${productCount} item${productCount === 1 ? '' : 's'} ready to browse`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={onFollowClick}
                variant={isFollowing ? 'outline' : 'primary'}
                size="sm"
                className="min-w-[44px]"
              >
                <Heart className={`h-4 w-4 ${isFollowing ? 'fill-current' : ''}`} />
              </Button>
              <Button onClick={onContactClick} variant="outline" size="sm">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {isSticky && <div className="h-20" />}
    </>
  )
}
