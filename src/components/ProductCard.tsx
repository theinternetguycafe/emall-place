import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Product } from '../types'
import { ShoppingBag, Star, Share2 } from 'lucide-react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { getSaleInfo } from '../utils/saleUtils'
import SaleBadge from './SaleBadge'
import LikeButton from './ui/LikeButton'
import ShareSale from './ShareSale'
import ProductImage from '../components/ProductImage'

interface ProductCardProps {
  product: Product & { seller_store?: { store_name: string } }
  onAddToCart?: () => void
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [showShareModal, setShowShareModal] = useState(false)

  const saleInfo = getSaleInfo({
    price: product.price,
    is_on_sale: product.is_on_sale || false,
    sale_price: product.sale_price || null,
    sale_starts_at: product.sale_starts_at || null,
    sale_ends_at: product.sale_ends_at || null,
    sale_label: product.sale_label || null
  })

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowShareModal(true)
  }

  return (
    <>
      <Link to={`/product/${product.id}`}>
        <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow duration-300 group cursor-pointer">
          {/* Image */}
          <div className="relative w-full aspect-square bg-gradient-to-br from-stone-100 to-stone-50 overflow-hidden flex items-center justify-center rounded-2xl border border-stone-100/50">
            {product.product_images?.[0] ? (
              <ProductImage
                src={product.product_images[0].url}
                alt={product.title}
                className="w-full h-full group-hover:scale-110 transition-transform duration-500"
                imgClassName="object-cover"
                transformOptions={{ width: 400, quality: 80, format: 'webp' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300">
                <ShoppingBag size={40} />
              </div>
            )}
            
            {/* Sale badge */}
            {saleInfo.isOnSale && (
              <SaleBadge label={saleInfo.saleLabel || `${saleInfo.discountPercent}% OFF`} />
            )}
            
            {/* Stock badge */}
            {!saleInfo.isOnSale && (
              <>
                {product.stock === 0 ? (
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="bg-rose-50 border-rose-200 text-rose-700 text-xs font-bold">
                      Out of stock
                    </Badge>
                  </div>
                ) : product.stock < 5 ? (
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 text-xs font-bold">
                      Low stock
                    </Badge>
                  </div>
                ) : null}
              </>
            )}

            {/* Action buttons overlay */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
              {/* Share Button - only show on sale items */}
              {saleInfo.isOnSale && (
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 shadow-md hover:shadow-lg"
                  title="Share this sale"
                >
                  <Share2 size={16} />
                </button>
              )}
              
              {/* Like Button */}
              <LikeButton productId={product.id} size={18} />
            </div>
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col">
            {/* Title */}
            <h3 className="font-bold text-sm leading-tight text-slate-900 line-clamp-2 mb-2">
              {product.title}
            </h3>

            {/* Seller */}
            {product.seller_store?.store_name && (
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wider mb-3">
                {product.seller_store.store_name}
              </p>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-xs text-stone-500 line-clamp-2 mb-4 flex-grow">
                {product.description}
              </p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-2 pt-3 border-t border-stone-100">
              <span className="text-lg font-black text-slate-900">
                R {saleInfo.displayPrice.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              {saleInfo.isOnSale && (
                <span className="text-xs text-stone-400 line-through">
                  R {saleInfo.originalPrice.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          </div>
        </Card>
      </Link>

      {/* Share Modal */}
      <ShareSale
        product={product}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </>
  )
}
