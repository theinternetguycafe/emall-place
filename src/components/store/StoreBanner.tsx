import React from 'react'
import { SellerStore } from '../../types'
import { Button } from '../ui/Button'

interface StoreBannerProps {
  store: SellerStore
  onShopNowClick?: () => void
}

export default function StoreBanner({ store, onShopNowClick }: StoreBannerProps) {
  return (
    <section className="relative isolate overflow-hidden bg-slate-900">
      <div className="relative h-[340px] w-full sm:h-[420px] lg:h-[520px]">
        {store.banner_url ? (
          <img
            src={store.banner_url}
            alt={`${store.store_name} banner`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${store.theme_color || '#0f172a'} 0%, #1e293b 50%, #0f172a 100%)`,
            }}
          >
            <div className="absolute -left-10 top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/35 to-transparent" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/55 to-slate-900/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

        <div className="relative mx-auto flex h-full max-w-7xl items-end px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="max-w-2xl text-white">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-white/85 backdrop-blur">
              EmallPlace Storefront
            </span>

            <h2 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              {store.announcement_text || store.store_name}
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              {store.announcement_text && store.tagline
                ? store.tagline
                : store.description || store.tagline || `Discover curated products from ${store.store_name}.`}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {onShopNowClick && (
                <Button
                  onClick={onShopNowClick}
                  className="bg-white text-slate-900 hover:bg-stone-100"
                  size="lg"
                >
                  Shop Now
                </Button>
              )}
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white/85 backdrop-blur">
                Branded storefront with trusted local products
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
