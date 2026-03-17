import React from 'react'
import { Product } from '../../types'
import { Link } from 'react-router-dom'
import ProductImage from '../ProductImage'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Eye, Package, ShoppingBag, Zap } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { getSaleInfo } from '../../utils/saleUtils'

interface FeaturedProductsProps {
  products: Product[]
  isLoading?: boolean
}

export default function FeaturedProducts({ products, isLoading }: FeaturedProductsProps) {
  const { addToCart } = useCart()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
          Featured Products
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
          {[1, 2, 3, 4].map(index => (
            <Card key={index} className="aspect-square animate-pulse bg-stone-100" />
          ))}
        </div>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return null
  }

  return (
    <section className="py-12">
      <div className="mb-8">
        <h2 className="mb-2 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
          <Zap className="h-6 w-6 text-amber-500" />
          Featured Products
        </h2>
        <p className="text-stone-600">Hand-picked highlights from this seller</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
        {products.map(product => {
          const saleInfo = getSaleInfo({
            price: product.price,
            is_on_sale: product.is_on_sale || false,
            sale_price: product.sale_price || null,
            sale_starts_at: product.sale_starts_at || null,
            sale_ends_at: product.sale_ends_at || null,
            sale_label: product.sale_label || null,
          })

          return (
            <Card key={product.id} className="flex h-full flex-col overflow-hidden bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <Link to={`/product/${product.id}`} className="group">
                <div className="relative aspect-square overflow-hidden bg-stone-100">
                  {product.product_images?.[0] ? (
                    <ProductImage
                      src={product.product_images[0].url}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      transformOptions={{ width: 500, quality: 75, format: 'webp' }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-300">
                      <Package size={40} />
                    </div>
                  )}

                  {saleInfo.isOnSale && (
                    <div className="absolute left-3 top-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      {saleInfo.saleLabel}
                    </div>
                  )}

                  {product.stock === 0 && (
                    <div className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white">
                      Out of stock
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex flex-1 flex-col p-4">
                <Link to={`/product/${product.id}`} className="block">
                  <h3 className="line-clamp-2 text-sm font-bold leading-tight text-slate-900">
                    {product.title}
                  </h3>
                  {product.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-stone-500">
                      {product.description}
                    </p>
                  )}
                </Link>

                <div className="mt-4 border-t border-stone-100 pt-4">
                  <div className="flex items-end gap-2">
                    <span className="text-lg font-black text-slate-900">
                      R {saleInfo.displayPrice.toLocaleString('en-ZA', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    {saleInfo.isOnSale && (
                      <span className="text-xs text-stone-400 line-through">
                        R {saleInfo.originalPrice.toLocaleString('en-ZA', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-bold text-stone-500">
                    {product.stock > 0 ? `${product.stock} in stock` : 'Currently unavailable'}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link to={`/product/${product.id}`}>
                    <Button variant="outline" className="w-full gap-2">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  <Button
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                    className="gap-2"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Quick Add
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
