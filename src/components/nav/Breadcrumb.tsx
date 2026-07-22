import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem { label: string; href?: string }
interface BreadcrumbProps { 
  items: BreadcrumbItem[]
  theme?: 'light' | 'dark' 
}

export default function Breadcrumb({ items, theme = 'light' }: BreadcrumbProps) {
  const isDark = theme === 'dark'
  const textClass = isDark ? 'text-white/70' : 'text-stone-400'
  const hoverClass = isDark ? 'hover:text-white' : 'hover:text-slate-900'
  const activeClass = isDark ? 'text-white' : 'text-slate-700'
  const chevronClass = isDark ? 'text-white/40' : 'text-stone-300'

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-1.5 text-xs font-semibold py-3 ${textClass}`}>
      <Link to="/" className={`${hoverClass} transition-colors flex items-center gap-1`} aria-label="Home">
        <Home size={13} />
      </Link>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          <ChevronRight size={13} className={`${chevronClass} flex-shrink-0`} />
          {item.href && idx < items.length - 1 ? (
            <Link to={item.href} className={`${hoverClass} transition-colors truncate max-w-[140px]`}>{item.label}</Link>
          ) : (
            <span className={`${activeClass} truncate max-w-[200px]`} aria-current="page">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}