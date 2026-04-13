import { Link } from 'react-router-dom'
import { Edit2, Trash2, Package, Eye, EyeOff } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import ProductImage from '../ProductImage'
import { Product } from '../../types'

interface SellerProductsTableProps {
  filteredProducts: Product[]
  searchQuery: string
  deleteProduct: (id: string) => Promise<void>
  toggleProductVisibility: (p: Product) => Promise<void>
  setEditingProduct: (p: Product) => void
  sellerType?: 'product' | 'service' | 'both'
}

export function SellerProductsTable({
  filteredProducts,
  searchQuery,
  deleteProduct,
  toggleProductVisibility,
  setEditingProduct,
  sellerType
}: SellerProductsTableProps) {
  return (
    <table className="w-full min-w-[800px] text-left">
      <thead className="bg-stone-50 border-b border-stone-100">
        <tr>
          {(sellerType === 'service' 
            ? ['Service Details', 'Base Rate', 'Status', 'Actions'] 
            : sellerType === 'both' 
              ? ['Item Details', 'Type', 'Price', 'Stock', 'Status', 'Sale', 'Actions'] 
              : ['Product Details', 'Price', 'Stock', 'Status', 'Sale', 'Actions']
          ).map(h => (
            <th key={h} className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-50 bg-white">
        {filteredProducts.map((product) => {
          const itemIsService = sellerType === 'both' ? (product.stock ?? 0) >= 999 : sellerType === 'service'
          return (
            <tr key={product.id} className="group hover:bg-stone-50/30 transition-colors">
              <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 flex-shrink-0 bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 flex items-center justify-center">
                    {(product as any).product_images?.[0] ? (
                      <ProductImage 
                        src={(product as any).product_images[0].url} 
                        className="h-full w-full object-cover" 
                        alt=""
                        transformOptions={{ width: 80, quality: 75, format: 'webp' }}
                      />
                    ) : (
                      <Package className="h-6 w-6 text-stone-300" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 group-hover:text-stone-600 transition-colors max-w-[180px] truncate">{product.title}</div>
                    <div className="text-[10px] text-stone-400 font-mono mt-1 uppercase tracking-tighter">ID: {product.id.slice(0, 8)}</div>
                  </div>
                </div>
              </td>
              
              {sellerType === 'both' && (
                <td className="px-8 py-6">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    itemIsService ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {itemIsService ? '⚡ Service' : '📦 Product'}
                  </span>
                </td>
              )}

              <td className="px-8 py-6 text-sm font-black text-slate-900">
                R {product.price.toLocaleString()}
              </td>
              
              {!itemIsService && (
                <td className="px-8 py-6">
                  <span className={`text-sm font-bold ${product.stock === 0 ? 'text-red-500' : product.stock <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {product.stock} units
                  </span>
                </td>
              )}
              {itemIsService && sellerType === 'both' && (
                <td className="px-8 py-6">
                  <span className="text-stone-300 text-sm font-black">∞</span>
                </td>
              )}

              <td className="px-8 py-6">
                <Badge variant={product.status === 'approved' ? 'success' : product.status === 'pending' ? 'warning' : 'error'} className="text-[9px] font-black uppercase rounded-full">
                  {product.status}
                </Badge>
              </td>

              {!itemIsService && (
                <td className="px-8 py-6">
                  {product.is_on_sale ? (
                    <Badge variant="warning" className="rounded-full text-[9px] font-black">ON SALE</Badge>
                  ) : (
                    <span className="text-stone-300 text-sm">—</span>
                  )}
                </td>
              )}
              {itemIsService && sellerType === 'both' && (
                <td className="px-8 py-6">
                  <span className="text-stone-300 text-sm">—</span>
                </td>
              )}

              <td className="px-8 py-6 text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-10 w-10 p-0 rounded-xl text-stone-400 hover:text-slate-900 hover:bg-slate-100 transition-colors" onClick={() => setEditingProduct(product)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className={`h-10 w-10 p-0 rounded-xl ${product.status === 'approved' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} onClick={() => toggleProductVisibility(product)}>
                    {product.status === 'approved' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-10 w-10 p-0 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => deleteProduct(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          )
        })}
        {filteredProducts.length === 0 && (
          <tr>
            <td colSpan={sellerType === 'both' ? 7 : 6} className="px-8 py-24 text-center">
               {searchQuery ? (
                 <div className="max-w-xs mx-auto text-center">
                    <Package className="h-12 w-12 text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-400 text-sm font-medium italic">
                      No products found matching your search.
                    </p>
                 </div>
               ) : (
                 <div className="max-w-sm mx-auto text-center bg-stone-50 rounded-3xl p-8 border border-stone-100">
                    <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <Package className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">No {sellerType === 'service' ? 'Services' : 'Products'} Yet</h3>
                    <p className="text-stone-500 text-sm mb-8">
                      Your {sellerType === 'service' ? 'service catalog' : 'inventory'} is currently empty. Start adding your unique {sellerType === 'service' ? 'professional services' : 'products'} to showcase them in the marketplace.
                    </p>
                    <Link to={sellerType === 'service' ? "/seller/services/new" : "/seller/products/new"}>
                      <Button className="rounded-full shadow-lg">
                        Add Your First {sellerType === 'service' ? 'Service' : 'Product'}
                      </Button>
                    </Link>
                  </div>
                )}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
