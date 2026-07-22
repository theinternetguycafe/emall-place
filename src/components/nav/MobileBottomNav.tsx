import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, Briefcase, User } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'

const NAV_ITEMS = [
  { label: 'Home',     href: '/',            icon: Home },
  { label: 'Shop',     href: '/marketplace', icon: ShoppingBag },
  { label: 'Services', href: '/services',    icon: Briefcase },
  { label: 'Account',  href: '/account',     icon: User },
]

export default function MobileBottomNav() {
  const { pathname } = useLocation()
  const { itemCount } = useCart()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-stone-100" aria-label="Main navigation">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const isShop = label === 'Shop'
          return (
            <Link key={href} to={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 relative transition-colors ${isActive ? 'text-slate-900' : 'text-stone-400 hover:text-slate-900'}`}
              aria-label={label} aria-current={isActive ? 'page' : undefined}
            >
              <span className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {isShop && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-slate-900 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
              {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-slate-900 rounded-b-full" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}