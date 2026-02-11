import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-700 ml-0.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-red-500 ml-0.5">{error}</p>}
      </div>
    )
  }
)
