import React from 'react'

interface SaleBadgeProps {
  label: string
  className?: string
}

export default function SaleBadge({ label, className = '' }: SaleBadgeProps) {
  return (
    <div className={`absolute top-3 right-3 ${className}`}>
      <div className="bg-gradient-to-br from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
        {label}
      </div>
    </div>
  )
}
