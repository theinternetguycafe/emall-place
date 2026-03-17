import React, { useEffect, useMemo, useState } from 'react'
import { Category, Product } from '../../types'
import { Link } from 'react-router-dom'
import ProductImage from '../ProductImage'
import { Card } from '../ui/Card'
import { Package, Package2, DollarSign, TrendingUp, ShoppingBag, Eye, SlidersHorizontal, Tags } from 'lucide-react'
import { Button } from '../ui/Button'
import { useCart } from '../../contexts/CartContext'
import { getSaleInfo } from '../../utils/saleUtils'

interface ProductGridWithFiltersProps {
  products: Product[]
  categories: Category[]
  selectedCategoryId?: string
  onCategoryChange?: (categoryId: string) => void
  isLoading?: boolean
}

type SortOption = 'newest' | 'price-low' | 'price-high' | 'popular'
type AvailabilityOption = 'all' | 'in-stock' | 'out-of-stock'

export default function ProductGridWithFilters({
  products,
  categories,
  selectedCategoryId = 'all',
  onCategoryChange,
  isLoading,
}: ProductGridWithFiltersProps) {
  const { addToCart } = useCart()
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [availability, setAvailability] = useState<AvailabilityOption>('all')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [showFilters, setShowFilters] = useState(false)

  const maxPrice = useMemo(() => Math.max(...products.map(product => product.price), 10000), [products])

  useEffect(() => {
    setPriceRange([0, maxPrice])
  }, [maxPrice])

  const sortedAndFilteredProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1]
      const matchesCategory = selectedCategoryId === 'all' || product.category_id === selectedCategoryId
      const matchesAvailability =
        availability === 'all' ||
        (availability === 'in-stock' && product.stock > 0) ||
        (availability === 'out-of-stock' && product.stock === 0)

      return matchesPrice && matchesCategory && matchesAvailability && product.status === 'approved'
    })

    const sorted = [...filtered]

    switch (sortBy) {
      case 'price-low':
        return sorted.sort((first, second) => first.price - second.price)
      case 'price-high':
        return sorted.sort((first, second) => second.price - first.price)
      case 'popular':
        return sorted.sort((first, second) => {
          if (first.is_on_sale !== second.is_on_sale) {
            return first.is_on_sale ? -1 : 1
          }
          return second.stock - first.stock
        })
      case 'newest':
      default:
        return sorted.sort(
          (first, second) =>
            new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
        )
    }
  }, [availability, priceRange, products, selectedCategoryId, sortBy])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
          All Products
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(index => (
            <Card key={index} className="aspect-square animate-pulse bg-stone-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="mb-2 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
            <Package2 className="h-6 w-6" />
            All Products
          </h2>
          <p className="text-stone-600">
            {sortedAndFilteredProducts.length} product{sortedAndFilteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setShowFilters(current => !current)}
          className="gap-2 sm:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className={`${showFilters ? 'block' : 'hidden'} w-full lg:block lg:w-72 lg:flex-shrink-0`}>
          <Card className="space-y-6 p-6">
            <div>
              <h3 className="mb-4 text-sm font-black uppercase tracking-tight text-slate-900">
                Sort By
              </h3>
              <div className="space-y-2">
                {[
                  { value: 'newest' as SortOption, label: 'Newest' },
                  { value: 'price-low' as SortOption, label: 'Price: Low to High' },
                  { value: 'price-high' as SortOption, label: 'Price: High to Low' },
                  { value: 'popular' as SortOption, label: 'Popular Picks' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSortBy(option.value)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors ${
                      sortBy === option.value
                        ? 'bg-slate-900 text-white'
                        : 'bg-stone-100 text-slate-900 hover:bg-stone-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-tight text-slate-900">
                <Tags className="h-4 w-4" />
                Category
              </h3>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onCategoryChange?.('all')}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors ${
                    selectedCategoryId === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-stone-100 text-slate-900 hover:bg-stone-200'
                  }`}
                >
                  All Categories
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onCategoryChange?.(category.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors ${
                      selectedCategoryId === category.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-stone-100 text-slate-900 hover:bg-stone-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-tight text-slate-900">
                <TrendingUp className="h-4 w-4" />
                Availability
              </h3>
              <div className="space-y-2">
                {[
                  { value: 'all' as AvailabilityOption, label: 'All Products' },
                  { value: 'in-stock' as AvailabilityOption, label: 'In Stock' },
                  { value: 'out-of-stock' as AvailabilityOption, label: 'Out of Stock' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAvailability(option.value)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors ${
                      availability === option.value
                        ? 'bg-slate-900 text-white'
                        : 'bg-stone-100 text-slate-900 hover:bg-stone-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-tight text-slate-900">
                <DollarSign className="h-4 w-4" />
                Price Range
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-600">
                    Min: R {priceRange[0].toLocaleString('en-ZA')}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={priceRange[0]}
                    onChange={event =>
                      setPriceRange([
                        Math.min(Number(event.target.value), priceRange[1]),
                        priceRange[1],
                      ])
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-600">
                    Max: R {priceRange[1].toLocaleString('en-ZA')}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={event =>
                      setPriceRange([
                        priceRange[0],
                        Math.max(Number(event.target.value), priceRange[0]),
                      ])
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setSortBy('newest')
                setAvailability('all')
                setPriceRange([0, maxPrice])
                onCategoryChange?.('all')
              }}
              className="w-full text-xs"
            >
              Reset Filters
            </Button>
          </Card>
        </div>

        <div className="flex-1">
          {sortedAndFilteredProducts.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-50">
                <Package className="h-8 w-8 text-stone-300" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                No products found
              </h3>
              <p className="mt-2 text-stone-600">
                Try adjusting your filters, price range, or selected category.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSortBy('newest')
                  setAvailability('all')
                  setPriceRange([0, maxPrice])
                  onCategoryChange?.('all')
                }}
                className="mt-6"
              >
                Reset Filters
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-6">
              {sortedAndFilteredProducts.map(product => {
                const saleInfo = getSaleInfo({
                  price: product.price,
                  is_on_sale: product.is_on_sale || false,
                  sale_price: product.sale_price || null,
                  sale_starts_at: product.sale_starts_at || null,
                  sale_ends_at: product.sale_ends_at || null,
                  sale_label: product.sale_label || null,
                })

                const productCategory = categories.find(category => category.id === product.category_id)

                return (
                  <Card
                    key={product.id}
                    className="flex h-full flex-col overflow-hidden bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <Link to={`/product/${product.id}`} className="group block">
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

                        <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur">
                          {product.stock > 0 ? 'In stock' : 'Out of stock'}
                        </div>
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col p-4">
                      {productCategory && (
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-stone-500">
                          {productCategory.name}
                        </p>
                      )}

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
          )}
        </div>
      </div>
    </section>
  )
}
