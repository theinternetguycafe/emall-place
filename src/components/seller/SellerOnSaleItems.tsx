import React, { useState } from 'react'
import { Product } from '../../types'
import { Share2, Flame, ArrowRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Link } from 'react-router-dom'
import ShareSale from '../ShareSale'
import { getSaleInfo } from '../../utils/saleUtils'

interface SellerOnSaleItemsProps {
  products: Product[]
}

export default function SellerOnSaleItems({ products }: SellerOnSaleItemsProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  const onSaleProducts = products.filter(p => p.is_on_sale)

  if (onSaleProducts.length === 0) {
    return (
      <Card className="p-12 text-center border-stone-100 shadow-sm">
        <Flame className="h-12 w-12 text-stone-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">No Items on Sale</h3>
        <p className="text-stone-500 text-sm mb-6">
          Create your first sale to boost visibility and attract customers!
        </p>
        <Link to="/seller">
          <Button className="rounded-full">
            <Flame className="h-4 w-4 mr-2" />
            Put Items on Sale
          </Button>
        </Link>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
            <Flame className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              Items on Sale
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              {onSaleProducts.length} {onSaleProducts.length === 1 ? 'item' : 'items'} currently on sale
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {onSaleProducts.map((product) => {
            const saleInfo = getSaleInfo({
              price: product.price,
              is_on_sale: product.is_on_sale || false,
              sale_price: product.sale_price || null,
              sale_starts_at: product.sale_starts_at || null,
              sale_ends_at: product.sale_ends_at || null,
              sale_label: product.sale_label || null,
            })

            const saleEndDate = product.sale_ends_at
              ? new Date(product.sale_ends_at)
              : null
            const daysRemaining = saleEndDate
              ? Math.ceil(
                  (saleEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                )
              : null

            return (
              <Card
                key={product.id}
                className="overflow-hidden border-stone-100 shadow-sm hover:shadow-md transition-all"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                  {product.product_images?.[0] ? (
                    <img
                      src={product.product_images[0].url}
                      alt={product.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <Flame size={40} />
                    </div>
                  )}

                  {/* Sale Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest px-3 py-1">
                      {saleInfo.discountPercent}% OFF
                    </Badge>
                  </div>

                  {/* Days Remaining */}
                  {daysRemaining !== null && daysRemaining >= 0 && (
                    <div className="absolute bottom-3 right-3">
                      <Badge
                        variant="outline"
                        className={`rounded-full text-[10px] font-black uppercase tracking-widest px-3 py-1 ${
                          daysRemaining <= 1
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : daysRemaining <= 3
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-white border-white text-slate-900'
                        }`}
                      >
                        {daysRemaining <= 0
                          ? 'Ending Today'
                          : `${daysRemaining}d Left`}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col h-full">
                  <h4 className="font-bold text-slate-900 line-clamp-2 mb-2">
                    {product.title}
                  </h4>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-lg font-black text-red-600">
                      R{Math.round(saleInfo.displayPrice).toLocaleString('en-ZA')}
                    </span>
                    <span className="text-xs text-stone-400 line-through">
                      R{Math.round(saleInfo.originalPrice).toLocaleString('en-ZA')}
                    </span>
                  </div>

                  {product.sale_label && (
                    <p className="text-xs text-stone-500 font-medium mb-4 line-clamp-1">
                      {product.sale_label}
                    </p>
                  )}

                  <div className="mt-auto flex items-center gap-2 pt-4 border-t border-stone-100 gap-3">
                    <button
                      onClick={() => {
                        setSelectedProduct(product)
                        setShowShareModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-50 px-4 py-2.5 rounded-xl hover:bg-red-100 transition-all text-[10px] font-black uppercase tracking-widest text-red-600"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>

                    <Link
                      to={`/product/${product.id}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-stone-50 px-4 py-2.5 rounded-xl hover:bg-slate-900 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest text-slate-900"
                    >
                      View
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Share Modal */}
      {selectedProduct && (
        <ShareSale
          product={selectedProduct}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  )
}
