import React from 'react'
import { Search, Package, ShoppingCart, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from './ui/Button'

type EmptyStateVariant = 'search' | 'cart' | 'orders' | 'products' | 'store' | 'generic'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  message?: string
  ctaLabel?: string
  ctaHref?: string
  onCta?: () => void
}

const VARIANTS: Record<EmptyStateVariant, { icon: React.ReactNode; title: string; message: string }> = {
  search: {
    icon: <Search className="h-10 w-10 text-stone-300" />,
    title: 'Nothing found',
    message: 'Try different filters or search terms.',
  },
  cart: {
    icon: <ShoppingCart className="h-10 w-10 text-stone-300" />,
    title: 'Your cart is empty',
    message: "You haven't added anything yet. Browse the marketplace to find something you love.",
  },
  orders: {
    icon: <Package className="h-10 w-10 text-stone-300" />,
    title: 'No orders yet',
    message: 'Your completed orders will appear here.',
  },
  products: {
    icon: <Package className="h-10 w-10 text-stone-300" />,
    title: 'No products yet',
    message: 'Add your first product to start selling.',
  },
  store: {
    icon: <Store className="h-10 w-10 text-stone-300" />,
    title: 'Store not found',
    message: 'This store may have been removed or is not available.',
  },
  generic: {
    icon: <Package className="h-10 w-10 text-stone-300" />,
    title: 'Nothing here yet',
    message: 'Check back soon.',
  },
}

export default function EmptyState({
  variant = 'generic',
  title,
  message,
  ctaLabel,
  ctaHref,
  onCta,
}: EmptyStateProps) {
  const config = VARIANTS[variant]
  const displayTitle = title ?? config.title
  const displayMessage = message ?? config.message

  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center bg-white rounded-[2rem] border-2 border-dashed border-stone-100">
      <div className="w-20 h-20 rounded-full bg-stone-50 flex items-center justify-center mb-6">
        {config.icon}
      </div>
      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
        {displayTitle}
      </h3>
      <p className="text-stone-500 text-sm font-medium max-w-xs leading-relaxed mb-8">
        {displayMessage}
      </p>
      {ctaHref && ctaLabel && (
        <Link to={ctaHref}>
          <Button className="rounded-full px-8 font-black">{ctaLabel}</Button>
        </Link>
      )}
      {onCta && ctaLabel && !ctaHref && (
        <Button className="rounded-full px-8 font-black" onClick={onCta}>{ctaLabel}</Button>
      )}
    </div>
  )
}