import React from 'react'
import { Link } from 'react-router-dom'
import { Product } from '../types'
import { ShoppingBag, Star } from 'lucide-react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'

interface ProductCardProps {
  product: Product & { seller_store?: { store_name: string } }
  onAddToCart?: () => void
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Link to={`/product/${product.id}`}>
      <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow duration-300 group cursor-pointer">
        {/* Image */}
        <div className="relative h-64 bg-stone-100 overflow-hidden">
          {product.product_images?.[0] ? (
            <img
              src={product.product_images[0].url}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300">
              <ShoppingBag size={40} />
            </div>
          )}
          
          {/* Stock badge */}
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
          <div className="flex items-baseline justify-between pt-3 border-t border-stone-100">
            <span className="text-lg font-black text-slate-900">
              R {product.price.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
