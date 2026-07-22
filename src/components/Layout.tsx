import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { supabase } from '../lib/supabase'
import { ShoppingCart, User as UserIcon, Store, LogOut, Search, Menu, X, ShieldCheck } from 'lucide-react'
import { Button } from './ui/Button'
import NotificationBell from './notifications/NotificationBell'
import MobileBottomNav from './nav/MobileBottomNav'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, sellerProfile, loading, signOut } = useAuth()
  const { itemCount } = useCart()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  // Global Seller Heartbeat
  React.useEffect(() => {
    if (profile?.role === 'seller' && sellerProfile) {
      const interval = setInterval(async () => {
        try {
          await supabase
            .from('seller_profiles')
            .update({ is_online: true })
            .eq('id', sellerProfile.id);
        } catch (err) {}
      }, 30000); // 30s heartbeat is enough for global
      return () => clearInterval(interval);
    }
  }, [profile, sellerProfile]);

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Skip to content - accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[999] focus:px-6 focus:py-3 focus:bg-slate-900 focus:text-white focus:rounded-full focus:font-black focus:text-sm">Skip to content</a>
      {/* Top Banner */}
      <div className="bg-slate-900 text-white py-2.5 text-center text-xs font-black uppercase tracking-[0.2em]">
        Complimentary Delivery on Orders Over R1000
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-stone-100">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 md:h-20 justify-between items-center">
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
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mt-0.5">Collective</span>
                </div>
              </Link>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center space-x-2">
                <Link 
                  to="/marketplace" 
                  className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                    isActive('/marketplace') ? 'text-slate-900 bg-stone-100' : 'text-stone-400 hover:text-slate-900 hover:bg-stone-50'
                  }`}
                >
                  Marketplace
                </Link>
                {profile?.role === 'seller' && sellerProfile && (
                  <Link 
                    to={`/store/${sellerProfile.store_slug || sellerProfile.id}`} 
                    className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                      isActive(`/store/${sellerProfile.store_slug || sellerProfile.id}`) ? 'text-emerald-600 bg-emerald-50 border border-emerald-200 shadow-sm' : 'text-stone-400 hover:text-slate-900 hover:bg-stone-50'
                    }`}
                  >
                    My Storefront
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1 md:space-x-2">
              <NotificationBell />
              <Link to="/cart" className="relative p-3 text-slate-400 hover:text-slate-900 transition-all group">
                <ShoppingCart className="h-6 w-6 group-hover:-translate-y-0.5 transition-transform" />
                {itemCount > 0 && (
                  <span className="absolute top-2 right-2 bg-slate-900 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                    {itemCount}
                  </span>
                )}
              </Link>

              <div className="hidden md:flex items-center space-x-2 border-l border-stone-100 ml-4 pl-6">
                {!loading ? (
                  user ? (
                    <div className="flex items-center space-x-3">
                      {profile?.role === 'seller' && (
                        <>
                          <Link to="/seller">
                            <Button variant="outline" size="sm" className="rounded-full border-stone-200 gap-2">
                              <Store className="h-4 w-4" />
                              Seller Hub
                            </Button>
                          </Link>
                        </>
                      )}
                      {profile?.role === 'admin' && (
                        <Link to="/admin">
                          <Button variant="primary" size="sm" className="rounded-full bg-slate-900 px-6">Admin Hub</Button>
                        </Link>
                      )}
                      <Link to="/account" className="p-3 text-slate-400 hover:text-slate-900 transition-all">
                        <UserIcon className="h-6 w-6" />
                      </Link>
                      <button 
                        onClick={() => signOut()}
                        className="p-3 text-stone-300 hover:text-rose-600 transition-all"
                        title="Sign Out"
                        aria-label="Sign Out"
                      >
                        <LogOut className="h-6 w-6" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Link to="/auth">
                        <Button variant="ghost" size="sm" className="text-stone-500 font-bold uppercase tracking-widest text-xs">Sign In</Button>
                      </Link>
                      <Link to="/auth?signup=true">
                        <Button size="sm" className="rounded-full px-6 font-black uppercase tracking-widest text-xs">Register</Button>
                      </Link>
                    </div>
                  )
                ) : null}
              </div>

              {/* Mobile Menu Toggle */}
              <button 
                className="md:hidden p-3 text-slate-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Side Panel */}
          <div className="relative flex w-[80%] max-w-sm flex-col overflow-y-auto bg-white shadow-xl animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between px-4 py-6 border-b border-stone-100">
              <Link to="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
                  <span className="text-white font-black text-lg italic leading-none">e</span>
                </div>
                <span className="text-lg font-black tracking-tighter text-slate-900 leading-none">
                  eMall
                </span>
              </Link>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500 hover:text-slate-900 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="px-4 py-8 flex flex-col flex-1">
              <div className="space-y-6 flex-1">
                <Link 
                  to="/marketplace" 
                  className="block text-2xl font-black text-slate-900 tracking-tight"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Marketplace
                </Link>
                <hr className="border-stone-100" />
                {!loading ? (
                  user ? (
                    <div className="space-y-4">
                      <Link to="/account" className="block text-lg font-bold text-stone-500 hover:text-slate-900" onClick={() => setIsMobileMenuOpen(false)}>Account</Link>
                      {profile?.role === 'seller' && (
                        <Link to="/seller" className="block text-lg font-bold text-stone-500 hover:text-slate-900" onClick={() => setIsMobileMenuOpen(false)}>Seller Hub</Link>
                      )}
                      {profile?.role === 'admin' && (
                        <Link to="/admin" className="block text-lg font-bold text-slate-900" onClick={() => setIsMobileMenuOpen(false)}>Admin Management</Link>
                      )}
                      <button onClick={() => { signOut(); setIsMobileMenuOpen(false); }} className="block w-full text-left text-lg font-bold text-rose-600 pt-4">Sign Out</button>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-4">
                      <Link to="/auth" className="block text-center py-4 bg-slate-900 text-white font-black rounded-2xl" onClick={() => setIsMobileMenuOpen(false)}>Get Started</Link>
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      <main id="main-content" className="flex-grow">{children}</main>

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
              <h4 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-8">Experience</h4>
              <ul className="space-y-4 text-xs font-bold">
                <li><Link to="/marketplace" className="hover:text-white transition-colors">The Marketplace</Link></li>
                <li><Link to="/marketplace?sort=newest" className="hover:text-white transition-colors">New Arrivals</Link></li>
                <li><Link to="/marketplace" className="hover:text-white transition-colors">Trending</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-8">Service</h4>
              <ul className="space-y-4 text-xs font-bold">
                <li><Link to="/help-centre" className="hover:text-white transition-colors">Help Centre</Link></li>
                <li><Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping & Delivery</Link></li>
                <li><Link to="/returns-policy" className="hover:text-white transition-colors">Returns Policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white text-xs font-black uppercase tracking-[0.2em] mb-8">Sellers</h4>
              <ul className="space-y-4 text-xs font-bold">
                <li><Link to="/auth?signup=true" className="hover:text-white transition-colors">Become a Seller</Link></li>
                <li><Link to="/seller-guidelines" className="hover:text-white transition-colors">Seller Guidelines</Link></li>
                <li><Link to="/community" className="hover:text-white transition-colors">Community Hub</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black uppercase tracking-widest">
            <p className="text-white/60">&copy; {new Date().getFullYear()} eMall Place Collective.</p>
            <div className="flex gap-10">
              <Link to="/privacy-policy" className="text-white/60 hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms-of-service" className="text-white/60 hover:text-white transition-colors">Terms</Link>
              <Link to="/legal" className="text-white/60 hover:text-white transition-colors">Legal</Link>
            </div>
          </div>
        </div>
      </footer>
      {/* Mobile bottom navigation bar */}
      <MobileBottomNav />
      {/* Spacer so content clears the bottom nav on mobile */}
      <div className="md:hidden h-16" aria-hidden="true" />
    </div>
  )
}
