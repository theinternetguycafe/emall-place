import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function Cart() {
  const { items, removeFromCart, updateQuantity, totalAmount } = useCart()
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const handleRemoveFromCart = (productId: string) => {
    removeFromCart(productId)
    addToast('Removed from your cart', 'info')
  }

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveFromCart(productId)
      return
    }
    updateQuantity(productId, newQuantity)
    addToast('Cart updated', 'info')
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-32 text-center">
        <div className="flex justify-center mb-8">
          <div className="p-8 bg-stone-100 rounded-full">
            <ShoppingBag className="h-16 w-16 text-stone-300" />
          </div>
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Your cart is empty</h2>
        <p className="text-stone-500 mb-10 text-lg max-w-md mx-auto">Browse our collection of unique items from independent sellers.</p>
        <Button
          size="lg"
          onClick={() => navigate('/shop')}
          className="rounded-full px-10"
        >
          Continue Shopping
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex items-baseline gap-4 mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Your Bag</h1>
        <span className="text-stone-400 text-lg font-medium">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-6">
          {items.map((item) => (
            <Card key={item.product.id} className="p-0 overflow-hidden group">
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-stone-100 overflow-hidden">
                  {item.product.product_images?.[0] ? (
                    <img 
                      src={item.product.product_images[0].url} 
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      alt={item.product.title} 
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-stone-300">
                      <ShoppingBag size={40} />
                    </div>
                  )}
                </div>
                
                <div className="flex-grow p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">
                        <Link to={`/product/${item.product.id}`} className="hover:text-stone-600 transition-colors">
                          {item.product.title}
                        </Link>
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-stone-400 hover:text-rose-600 -mt-2 -mr-2"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-stone-400">
                      {(item.product as any).seller_store?.store_name}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-end mt-8">
                    <div className="flex items-center bg-stone-50 rounded-full border border-stone-200 p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="px-4 text-sm font-bold w-10 text-center">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-400 font-bold uppercase tracking-widest mb-1">Subtotal</p>
                      <p className="text-2xl font-black text-slate-900">
                        R {(item.product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-4">
          <Card className="sticky top-24 border-2 border-slate-900 bg-white p-8">
            <h2 className="text-2xl font-black mb-8 text-slate-900 tracking-tight">Summary</h2>
            <div className="space-y-6 mb-10">
              <div className="flex justify-between text-stone-500 font-medium">
                <span>Subtotal</span>
                <span className="text-slate-900">R {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-500 font-medium">
                <span>Shipping</span>
                <span className="text-emerald-600 font-bold uppercase text-sm tracking-widest">At checkout</span>
              </div>
              <div className="h-px bg-stone-100" />
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold text-slate-900">Total</span>
                <span className="text-3xl font-black text-slate-900">R {totalAmount.toLocaleString()}</span>
              </div>
            </div>
            
            <Button
              size="lg"
              onClick={() => {
                if (!user) {
                  addToast('Please sign in to continue to checkout', 'info')
                  navigate('/auth')
                  return
                }
                navigate('/checkout')
              }}
              className="w-full rounded-full py-8 text-lg group"
            >
              Pay Now
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 text-xs text-stone-400 font-medium uppercase tracking-wider justify-center">
                <span className="w-8 h-px bg-stone-100" />
                <span>Secure</span>
                <span className="w-8 h-px bg-stone-100" />
              </div>
              <p className="text-[10px] text-center text-stone-400 italic leading-relaxed">
                All transactions are encrypted and secure.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
