import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm shadow-slate-200',
      secondary: 'bg-stone-200 text-slate-900 hover:bg-stone-300',
      outline: 'border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
      danger: 'bg-red-50 text-red-600 hover:bg-red-100'
    }

    const sizes = {
      sm: 'h-9 px-3 text-xs',
      md: 'h-11 px-6 text-sm',
      lg: 'h-13 px-8 text-base',
      icon: 'h-10 w-10 p-0'
    }

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={loading}
        {...props}
      >
        {loading ? (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </button>
    )
  }
)
