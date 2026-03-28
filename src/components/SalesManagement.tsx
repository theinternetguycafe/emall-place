import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Product } from '../types'
import { Edit2, Trash2, Check, X, Tag, AlertCircle } from 'lucide-react'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Input } from './ui/Input'

interface SalesManagementProps {
  isAdmin: boolean
}

export default function SalesManagement({ isAdmin }: SalesManagementProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [saleFilter, setSaleFilter] = useState<'all' | 'on-sale' | 'not-on-sale'>('all')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkDiscount, setBulkDiscount] = useState(10)
  const [editFormData, setEditFormData] = useState({
    salePrice: '',
    saleLabel: '',
    saleStartsAt: '',
    saleEndsAt: '',
    isOnSale: false
  })

  useEffect(() => {
    if (isAdmin) {
      fetchProducts()
    }
  }, [isAdmin])

  useEffect(() => {
    filterProducts()
  }, [products, searchTerm, saleFilter])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('products')
        .select('*, seller_store:seller_store_id(*)')
        .order('created_at', { ascending: false })

      // If not admin, only show approved products. 
      // But this component seems to be primarily for admin use given the prop 'isAdmin'.
      if (!isAdmin) {
        query = query.eq('status', 'approved')
      }

      const { data, error } = await query

      if (error) throw error
      setProducts(data || [])
    } catch (err: any) {
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = products

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.seller_store as any)?.store_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by sale status
    if (saleFilter === 'on-sale') {
      filtered = filtered.filter(p => p.is_on_sale)
    } else if (saleFilter === 'not-on-sale') {
      filtered = filtered.filter(p => !p.is_on_sale)
    }

    setFilteredProducts(filtered)
  }

  const handleSelectProduct = (id: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedProducts(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
    }
  }

  const handleEditClick = (product: Product) => {
    setEditingProduct(product)
    setEditFormData({
      salePrice: product.sale_price?.toString() || '',
      saleLabel: product.sale_label || '',
      saleStartsAt: product.sale_starts_at?.split('T')[0] || '',
      saleEndsAt: product.sale_ends_at?.split('T')[0] || '',
      isOnSale: product.is_on_sale || false
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingProduct) return

    // Validation
    if (editFormData.isOnSale) {
      if (!editFormData.salePrice) {
        alert('Sale price is required when putting on sale')
        return
      }
      const salePrice = parseFloat(editFormData.salePrice)
      if (salePrice >= editingProduct.price) {
        alert('Sale price must be less than original price')
        return
      }
      if (salePrice <= 0) {
        alert('Sale price must be greater than zero')
        return
      }
      if (editFormData.saleEndsAt && new Date(editFormData.saleEndsAt) < new Date()) {
        alert('Sale end date must be in the future')
        return
      }
      const discount = Math.round(((editingProduct.price - salePrice) / editingProduct.price) * 100)
      if (discount > 70) {
        if (!confirm(`This is a ${discount}% discount. Are you sure you want to continue?`)) {
          return
        }
      }
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({
          is_on_sale: editFormData.isOnSale,
          sale_price: editFormData.isOnSale ? parseFloat(editFormData.salePrice) : null,
          sale_label: editFormData.isOnSale ? editFormData.saleLabel || null : null,
          sale_starts_at: editFormData.isOnSale && editFormData.saleStartsAt
            ? new Date(editFormData.saleStartsAt).toISOString()
            : null,
          sale_ends_at: editFormData.isOnSale && editFormData.saleEndsAt
            ? new Date(editFormData.saleEndsAt).toISOString()
            : null
        })
        .eq('id', editingProduct.id)

      if (error) throw error
      setShowEditModal(false)
      fetchProducts()
    } catch (err: any) {
      console.error('Error updating product:', err)
      alert('Failed to update product')
    }
  }

  const handleBulkApplySale = async () => {
    if (selectedProducts.size === 0) {
      alert('Select products to apply sale')
      return
    }
    if (bulkDiscount < 1 || bulkDiscount > 99) {
      alert('Discount must be between 1 and 99%')
      return
    }

    try {
      const bulkUpdates = Array.from(selectedProducts).map(productId => {
        const product = products.find(p => p.id === productId)
        if (!product) return null
        const salePrice = Math.round(product.price * (1 - bulkDiscount / 100) * 100) / 100
        return {
          id: productId,
          salePrice
        }
      }).filter(Boolean)

      for (const update of bulkUpdates) {
        if (update) {
          await supabase
            .from('products')
            .update({
              is_on_sale: true,
              sale_price: update.salePrice,
              sale_label: `${bulkDiscount}% OFF`,
              sale_starts_at: new Date().toISOString(),
              sale_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', update.id)
        }
      }

      setShowBulkModal(false)
      setSelectedProducts(new Set())
      fetchProducts()
    } catch (err: any) {
      console.error('Error applying bulk sale:', err)
      alert('Failed to apply bulk sale')
    }
  }

  const handleRemoveSale = async (productId: string) => {
    if (!confirm('Remove sale from this product?')) return

    try {
      await supabase
        .from('products')
        .update({
          is_on_sale: false,
          sale_price: null,
          sale_label: null,
          sale_starts_at: null,
          sale_ends_at: null
        })
        .eq('id', productId)

      fetchProducts()
    } catch (err: any) {
      console.error('Error removing sale:', err)
      alert('Failed to remove sale')
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('PERMANENTLY DELETE this product? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error
      fetchProducts()
    } catch (err: any) {
      console.error('Error deleting product:', err)
      alert('Failed to delete product')
    }
  }

  const handleBulkRemoveSale = async () => {
    if (selectedProducts.size === 0) {
      alert('Select products to remove sale')
      return
    }
    if (!confirm(`Remove sale from ${selectedProducts.size} product(s)?`)) return

    try {
      for (const productId of selectedProducts) {
        await supabase
          .from('products')
          .update({
            is_on_sale: false,
            sale_price: null,
            sale_label: null,
            sale_starts_at: null,
            sale_ends_at: null
          })
          .eq('id', productId)
      }

      setSelectedProducts(new Set())
      fetchProducts()
    } catch (err: any) {
      console.error('Error removing bulk sale:', err)
      alert('Failed to remove bulk sale')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 border-b border-stone-100 pb-4">
        <h2 className="text-xl font-bold flex items-center gap-3 text-slate-900 uppercase tracking-tight">
          <Tag className="h-5 w-5" />
          Sales Management
          <Badge variant="outline" className="rounded-full">{filteredProducts.length}</Badge>
        </h2>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Input
          type="text"
          placeholder="Search by product or store name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="rounded-full"
        />
        <select
          value={saleFilter}
          onChange={(e) => setSaleFilter(e.target.value as any)}
          className="px-4 py-2 border border-stone-200 rounded-full text-sm font-medium"
        >
          <option value="all">All Products</option>
          <option value="on-sale">On Sale</option>
          <option value="not-on-sale">Not On Sale</option>
        </select>
        <div className="flex gap-2">
          {selectedProducts.size > 0 && (
            <>
              <Button
                size="sm"
                onClick={() => setShowBulkModal(true)}
                className="flex-1 rounded-full bg-amber-500 hover:bg-amber-600 text-white"
              >
                Apply Sale ({selectedProducts.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkRemoveSale}
                className="flex-1 rounded-full"
              >
                Remove Sale
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Products Table */}
      <Card className="p-0 overflow-hidden border-stone-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-stone-100">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-stone-400 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-stone-400 uppercase tracking-widest">Store</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-stone-400 uppercase tracking-widest">Price</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-stone-400 uppercase tracking-widest">Sale Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-stone-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-50">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 max-w-48 truncate">{product.title}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {(product.seller_store as any)?.store_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">
                      R {product.price.toLocaleString()}
                    </div>
                    {product.is_on_sale && (
                      <div className="text-xs text-orange-600 font-medium">
                        Sale: R {product.sale_price?.toLocaleString() || 'N/A'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {product.is_on_sale ? (
                      <Badge variant="success" className="rounded-full text-xs">
                        On Sale
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full text-xs">
                        Regular Price
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 hover:bg-blue-50 rounded-full"
                        onClick={() => handleEditClick(product)}
                      >
                        <Edit2 size={18} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50 rounded-full"
                        onClick={() => handleDeleteProduct(product.id)}
                        title="Permanently Delete"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className="py-20 text-center">
            <div className="bg-stone-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="text-stone-300" size={24} />
            </div>
            <p className="text-stone-400 font-medium italic">No products found</p>
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Edit2 className="h-6 w-6" />
                Edit Sale: {editingProduct.title}
              </h3>

              <form className="space-y-6">
                {/* Toggle on/off sale */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isOnSale}
                      onChange={(e) => setEditFormData({ ...editFormData, isOnSale: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <span className="font-semibold text-slate-900">Put this product on sale</span>
                  </label>
                </div>

                {editFormData.isOnSale && (
                  <>
                    {/* Sale Price */}
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">
                        Sale Price (ZAR) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editFormData.salePrice}
                        onChange={(e) => setEditFormData({ ...editFormData, salePrice: e.target.value })}
                        placeholder={`Must be less than R${editingProduct.price}`}
                      />
                      {editFormData.salePrice && (
                        <div className="mt-2 text-sm text-slate-600">
                          Discount: {Math.round(((editingProduct.price - parseFloat(editFormData.salePrice)) / editingProduct.price) * 100)}%
                        </div>
                      )}
                    </div>

                    {/* Sale Label */}
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">
                        Sale Label (optional)
                      </label>
                      <Input
                        type="text"
                        value={editFormData.saleLabel}
                        onChange={(e) => setEditFormData({ ...editFormData, saleLabel: e.target.value })}
                        placeholder="e.g. Flash Sale, Mega Deal"
                      />
                    </div>

                    {/* Sale Starts At */}
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">
                        Sale Starts (optional)
                      </label>
                      <Input
                        type="datetime-local"
                        value={editFormData.saleStartsAt}
                        onChange={(e) => setEditFormData({ ...editFormData, saleStartsAt: e.target.value })}
                      />
                    </div>

                    {/* Sale Ends At */}
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">
                        Sale Ends (optional - must be future date)
                      </label>
                      <Input
                        type="datetime-local"
                        value={editFormData.saleEndsAt}
                        onChange={(e) => setEditFormData({ ...editFormData, saleEndsAt: e.target.value })}
                      />
                    </div>

                    {/* Warning */}
                    {editFormData.salePrice && parseFloat(editFormData.salePrice) > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <strong>Sanity Check:</strong> Discounts over 70% require confirmation. Make sure pricing is intentional.
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    className="flex-1 rounded-full bg-slate-900 text-white"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Bulk Sale Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Tag className="h-6 w-6" />
                Put {selectedProducts.size} Products on Sale
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    Discount Percentage (%)
                  </label>
                  <div className="flex gap-4">
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={bulkDiscount}
                      onChange={(e) => setBulkDiscount(Math.max(1, Math.min(99, parseInt(e.target.value) || 0)))}
                      className="flex-1"
                    />
                    <div className="text-right">
                      <div className="text-3xl font-black text-slate-900">{bulkDiscount}%</div>
                      <div className="text-xs text-stone-400">OFF</div>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 rounded-lg p-4">
                  <p className="text-sm text-stone-600 font-medium">
                    Examples of pricing:
                  </p>
                  <div className="space-y-1 mt-2 text-xs text-stone-500 font-mono">
                    <p>R100 → R{Math.round(100 * (1 - bulkDiscount / 100))}</p>
                    <p>R500 → R{Math.round(500 * (1 - bulkDiscount / 100))}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowBulkModal(false)}
                    className="flex-1 rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkApplySale}
                    className="flex-1 rounded-full bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    Apply to {selectedProducts.size}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
