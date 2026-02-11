import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { ShoppingCart, User as UserIcon, Store, LogOut, Search, Menu, X, ShieldCheck } from 'lucide-react'
import { Button } from './ui/Button'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth()
  const { itemCount } = useCart()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white py-2.5 text-center text-[10px] font-black uppercase tracking-[0.3em]">
        Complimentary Delivery on Orders Over R1000
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-stone-100">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-24 justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-12">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <span className="text-white font-black text-xl italic leading-none">e</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tighter text-slate-900 leading-none">
                    eMall<span className="text-stone-400">Place</span>
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-stone-400 mt-1">Collective</span>
                </div>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center space-x-2">
                <Link 
                  to="/shop" 
                  className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                    isActive('/shop') ? 'text-slate-900 bg-stone-100' : 'text-stone-400 hover:text-slate-900 hover:bg-stone-50'
                  }`}
                >
                  Marketplace
                </Link>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-1 md:space-x-2">
              <Link to="/cart" className="relative p-3 text-slate-400 hover:text-slate-900 transition-all group">
                <ShoppingCart className="h-6 w-6 group-hover:-translate-y-0.5 transition-transform" />
                {itemCount > 0 && (
                  <span className="absolute top-2 right-2 bg-slate-900 text-white text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                    {itemCount}
                  </span>
                )}
              </Link>

              <div className="hidden md:flex items-center space-x-2 border-l border-stone-100 ml-4 pl-6">
                {user ? (
                  <div className="flex items-center space-x-3">
                    {profile?.role === 'seller' && (
                      <Link to="/seller">
                        <Button variant="outline" size="sm" className="rounded-full border-stone-200 gap-2">
                          <Store className="h-4 w-4" />
                          Seller Hub
                        </Button>
                      </Link>
                    )}
                    {profile?.role === 'admin' && (
                      <Link to="/admin">
                        <Button variant="primary" size="sm" className="rounded-full bg-slate-900">Admin</Button>
                      </Link>
                    )}
                    <Link to="/account/orders" className="p-3 text-slate-400 hover:text-slate-900 transition-all">
                      <UserIcon className="h-6 w-6" />
                    </Link>
                    <button 
                      onClick={() => signOut()}
                      className="p-3 text-stone-300 hover:text-rose-600 transition-all"
                      title="Sign Out"
                    >
                      <LogOut className="h-6 w-6" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link to="/auth">
                      <Button variant="ghost" size="sm" className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Sign In</Button>
                    </Link>
                    <Link to="/auth?signup=true">
                      <Button size="sm" className="rounded-full px-6 font-black uppercase tracking-widest text-[10px]">Register</Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button 
                className="md:hidden p-3 text-slate-900"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-stone-100 animate-in slide-in-from-top duration-300">
          <div className="px-4 py-8 space-y-6">
            <Link 
              to="/shop" 
              className="block text-2xl font-black text-slate-900 tracking-tight"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Marketplace
            </Link>
            <hr className="border-stone-100" />
            {user ? (
              <div className="space-y-4">
                <Link to="/account/orders" className="block text-lg font-bold text-stone-500" onClick={() => setIsMobileMenuOpen(false)}>My Orders</Link>
                {profile?.role === 'seller' && (
                  <Link to="/seller" className="block text-lg font-bold text-stone-500" onClick={() => setIsMobileMenuOpen(false)}>Seller Hub</Link>
                )}
                <button onClick={() => { signOut(); setIsMobileMenuOpen(false); }} className="block w-full text-left text-lg font-bold text-rose-600 pt-4">Sign Out</button>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                <Link to="/auth" className="block text-center py-4 bg-slate-900 text-white font-black rounded-2xl" onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-grow">{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900 text-stone-500 py-24 mt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
            <div className="col-span-1 md:col-span-1">
              <Link to="/" className="flex items-center space-x-3 mb-8">
                <div className="w-8 h-8 bg-white text-slate-900 rounded-xl flex items-center justify-center">
                  <span className="font-black italic">e</span>
                </div>
                <span className="text-xl font-black tracking-tighter text-white">
                  eMall<span className="text-stone-500">Place</span>
                </span>
              </Link>
              <p className="text-xs leading-relaxed font-medium max-w-xs">
                South Africa's premier multi-vendor collective. We bridge the gap between independent artisans and discerning customers.
              </p>
            </div>

            <div>
              <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-8">Experience</h4>
              <ul className="space-y-4 text-xs font-bold">
                <li><Link to="/shop" className="hover:text-white transition-colors">The Marketplace</Link></li>
                <li><Link to="/shop?sort=newest" className="hover:text-white transition-colors">New Arrivals</Link></li>
                <li><Link to="/shop" className="hover:text-white transition-colors">Curation List</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-8">Service</h4>
              <ul className="space-y-4 text-xs font-bold">
                <li><Link to="/" className="hover:text-white transition-colors">Concierge</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">Shipping Etiquette</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">Returns & Refinement</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-8">The Guild</h4>
              <ul className="space-y-4 text-xs font-bold">
                <li><Link to="/auth" className="hover:text-white transition-colors">Become a Partner</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">Merchant Guidelines</Link></li>
                <li><Link to="/" className="hover:text-white transition-colors">The Hub</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black uppercase tracking-widest">
            <p className="text-white/20">&copy; {new Date().getFullYear()} eMall Place Collective.</p>
            <div className="flex gap-10">
              <Link to="/" className="text-white/40 hover:text-white transition-colors">Privacy</Link>
              <Link to="/" className="text-white/40 hover:text-white transition-colors">Terms</Link>
              <Link to="/" className="text-white/40 hover:text-white transition-colors">Legal</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
