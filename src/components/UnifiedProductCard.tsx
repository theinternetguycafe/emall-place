import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Product } from '../types'
import { ShoppingCart, ShoppingBag, Package, BadgeCheck } from 'lucide-react'
import { Badge } from './ui/Badge'
import { getSaleInfo } from '../utils/saleUtils'
import SaleBadge from './SaleBadge'
import LikeButton from './ui/LikeButton'
import ShareSale from './ShareSale'
import ProductImage from './ProductImage'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'

type CardVariant = 'grid' | 'compact' | 'featured'

interface UnifiedProductCardProps {
  product: Product & {
    seller_store?: {
      store_name?: string
      kyc_status?: string
      rating_avg?: number
      rating_count?: number
    }
  }
  variant?: CardVariant
  showAddToCart?: boolean
  showSeller?: boolean
  showDescription?: boolean
}

/**
 * Unified ProductCard — Modern African Premium
 * Single component replacing three divergent implementations.
 * All variants use object-contain on warm-white background.
 */
export default function UnifiedProductCard({
  product,
  variant = 'grid',
  showAddToCart = true,
  showSeller = true,
  showDescription = false,
}: UnifiedProductCardProps) {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { addToast } = useToast()
  const [adding, setAdding] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const saleInfo = getSaleInfo({
    price: product.price,
    is_on_sale: product.is_on_sale || false,
    sale_price: product.sale_price || null,
    sale_starts_at: product.sale_starts_at || null,
    sale_ends_at: product.sale_ends_at || null,
    sale_label: product.sale_label || null,
  })

  const storeName = product.seller_store?.store_name
  const isVerified = (product.seller_store?.kyc_status === 'verified' || (product.seller_store as any)?.kyc_status === 'approved')
  const rating = product.seller_store?.rating_avg
  const ratingCount = product.seller_store?.rating_count
  const imageUrl = product.product_images?.[0]?.url

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (adding || product.stock === 0) return
    setAdding(true)
    addToCart(product)
    addToast(`${product.title} added to your bag 🛍️`, 'success')
    setTimeout(() => setAdding(false), 800)
  }

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowShareModal(true)
  }

  /* ── Compact variant (e.g. search results, suggestions) ── */
  if (variant === 'compact') {
    return (
      <>
        <Link
          to={`/product/${product.id}`}
          className="flex gap-4 items-center group p-3 rounded-xl hover:bg-stone-50 transition-colors"
        >
          <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-[#FAFAF8] border border-stone-100 overflow-hidden flex items-center justify-center">
            {imageUrl ? (
              <ProductImage
                src={imageUrl}
                alt={product.title}
                className="w-full h-full"
                imgClassName="object-contain"
                transformOptions={{ width: 128, quality: 80, format: 'webp' }}
              />
            ) : (
              <Package size={24} className="text-stone-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{product.title}</p>
            {storeName && (
              <p className="text-xs text-stone-400 truncate mt-0.5">{storeName}</p>
            )}
            <p className="text-sm font-black text-slate-900 mt-1">
              R {saleInfo.displayPrice.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </Link>
        <ShareSale product={product} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
      </>
    )
  }

  /* ── Grid variant (default — Shop page, Home featured grid) ── */
  return (
    <>
      <div className="group flex flex-col">

        {/* Image Container — always 4:5, always object-contain, warm-white bg */}
        <Link to={`/product/${product.id}`} className="block">
          <div className="relative aspect-[4/5] bg-[#FAFAF8] rounded-[20px] overflow-hidden border border-stone-100 shadow-sm group-hover:shadow-lg transition-all duration-500">

            {/* Product image */}
            {imageUrl ? (
              <ProductImage
                src={imageUrl}
                alt={product.title}
                className="w-full h-full group-hover:scale-[1.03] transition-transform duration-700"
                imgClassName="object-contain"
                transformOptions={{ width: 600, quality: 85, format: 'webp' }}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-200">
                <Package size={48} />
              </div>
            )}

            {/* Sale badge — always visible when on sale */}
            {saleInfo.isOnSale && (
              <SaleBadge
                label={(saleInfo.discountPercent ?? 0) > 0
                  ? `${(saleInfo.discountPercent ?? 0)}% OFF`
                  : (saleInfo.saleLabel || 'SALE')}
                className="top-3 right-3"
              />
            )}

            {/* Stock badges — only when NOT on sale to avoid overlap */}
            {!saleInfo.isOnSale && product.stock === 0 && (
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="bg-rose-50 border-rose-200 text-rose-700 text-xs font-bold">
                  Sold Out
                </Badge>
              </div>
            )}
            {!saleInfo.isOnSale && product.stock > 0 && product.stock <= 5 && (
              <div className="absolute bottom-3 left-3">
                <Badge variant="warning" className="rounded-full px-3 py-1 text-xs font-bold shadow-md">
                  Only {product.stock} left
                </Badge>
              </div>
            )}

            {/* Like button */}
            <div className="absolute top-3 left-3 z-10">
              <LikeButton productId={product.id} size={18} />
            </div>

            {/* Quick view overlay on hover */}
            <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/4 transition-colors duration-500 pointer-events-none" />
          </div>
        </Link>

        {/* Card content */}
        <div className="flex flex-col flex-1 pt-4 px-1">

          {/* Seller row */}
          {showSeller && storeName && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-semibold text-stone-400 truncate max-w-[140px]">
                {storeName}
              </span>
              {isVerified && (
                <BadgeCheck size={13} className="text-emerald-500 flex-shrink-0" aria-label="Verified seller" />
              )}
            </div>
          )}

          {/* Title */}
          <Link to={`/product/${product.id}`}>
            <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-1 group-hover:text-stone-600 transition-colors">
              {product.title}
            </h3>
          </Link>

          {/* Optional description */}
          {showDescription && product.description && (
            <p className="text-xs text-stone-500 line-clamp-2 mb-3 leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Rating */}
          {rating != null && rating > 0 && (
            <div className="flex items-center gap-1 mb-2" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
              <span className="text-amber-400 text-xs">★</span>
              <span className="text-xs font-semibold text-stone-600">{rating.toFixed(1)}</span>
              {ratingCount != null && (
                <span className="text-xs text-stone-400">({ratingCount})</span>
              )}
            </div>
          )}

          {/* Price row */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-stone-100">
            <div className="flex flex-col gap-0.5">
              <span className={`font-black text-lg leading-none ${saleInfo.isOnSale ? 'text-red-600' : 'text-slate-900'}`}>
                R {saleInfo.displayPrice.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
              </span>
              {saleInfo.isOnSale && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-400 line-through">
                    R {saleInfo.originalPrice.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
                  </span>
                  {(saleInfo.discountPercent ?? 0) > 0 && (
                    <span className="text-xs font-bold text-emerald-600">
                      Save {saleInfo.discountPercent ?? 0}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Add to Cart CTA */}
            {showAddToCart && product.stock > 0 && (
              <button
                onClick={handleAddToCart}
                disabled={adding}
                aria-label={adding ? 'Adding to cart' : 'Add to cart'}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-900 text-white flex items-center justify-center hover:bg-emerald-600 active:scale-95 transition-all duration-200 shadow-sm disabled:opacity-60"
              >
                {adding
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <ShoppingCart size={18} />
                }
              </button>
            )}
            {showAddToCart && product.stock === 0 && (
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wide">Sold Out</span>
            )}
          </div>
        </div>
      </div>

      <ShareSale product={product} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </>
  )
}