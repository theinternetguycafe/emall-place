import { Badge } from '../ui/Badge'
import { ShoppingBag } from 'lucide-react'

interface SellerOrdersTableProps {
  filteredOrders: any[]
  searchQuery: string
  updateItemStatus: (itemId: string, status: string) => Promise<void>
}

export function SellerOrdersTable({
  filteredOrders,
  searchQuery,
  updateItemStatus
}: SellerOrdersTableProps) {
  return (
    <table className="w-full min-w-[800px] text-left">
      <thead>
        <tr className="bg-stone-50/50">
          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Order ID</th>
          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Customer</th>
          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Product</th>
          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Amount</th>
          <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Status</th>
          <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">Manage</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-50 bg-white">
        {filteredOrders.map((item) => (
          <tr key={item.id} className="group hover:bg-stone-50/30 transition-colors">
            <td className="px-8 py-6">
              <div className="text-sm font-bold text-slate-900">#{item.orders.id.slice(0, 8).toUpperCase()}</div>
              <div className="text-[10px] text-stone-400 font-mono mt-1 uppercase tracking-tighter">{new Date(item.orders.created_at).toLocaleDateString()}</div>
            </td>
            <td className="px-8 py-6">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-stone-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500 border border-stone-200">
                     {item.orders.profiles?.full_name?.charAt(0) || 'G'}
                  </div>
                  <span className="text-sm font-medium text-slate-600 truncate max-w-[120px]">
                    {item.orders.profiles?.full_name || 'Guest'}
                  </span>
               </div>
            </td>
            <td className="px-8 py-6">
              <div className="text-sm font-bold text-slate-900 group-hover:text-stone-600 transition-colors">{item.products?.title}</div>
              <div className="text-[10px] text-stone-400 font-medium mt-0.5">Quantity: {item.qty}</div>
            </td>
            <td className="px-8 py-6 text-sm font-black text-slate-900">
              R {item.item_total.toLocaleString()}
            </td>
            <td className="px-8 py-6">
              <Badge 
                variant={
                  item.item_status === 'delivered' ? 'success' : 
                  item.item_status === 'cancelled' ? 'error' : 
                  'warning'
                } 
                className="text-[9px] font-black uppercase rounded-full"
              >
                {item.item_status}
              </Badge>
            </td>
            <td className="px-8 py-6 text-right">
              <select
                className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all cursor-pointer appearance-none text-slate-900 shadow-sm"
                value={item.item_status}
                onChange={(e) => updateItemStatus(item.id, e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </td>
          </tr>
        ))}
        {filteredOrders.length === 0 && (
          <tr>
            <td colSpan={6} className="px-8 py-24 text-center">
               <div className="max-w-xs mx-auto text-center">
                  <ShoppingBag className="h-12 w-12 text-stone-200 mx-auto mb-4" />
                  <p className="text-stone-400 text-sm font-medium italic">
                    {searchQuery ? "No orders found matching your search." : "No orders have been placed for your items yet. They will appear here once acquired."}
                  </p>
               </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}
