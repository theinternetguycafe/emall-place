import React from 'react'

type PriceSize = 'card' | 'pdp' | 'cart' | 'mini'

interface PriceDisplayProps {
  displayPrice: number
  originalPrice?: number
  isOnSale?: boolean
  discountPercent?: number
  size?: PriceSize
}

const SIZE_MAP: Record<PriceSize, { main: string; strike: string; save: string }> = {
  mini:  { main: 'text-sm font-black',  strike: 'text-xs', save: 'text-xs' },
  card:  { main: 'text-xl font-black',  strike: 'text-xs', save: 'text-xs' },
  cart:  { main: 'text-base font-black', strike: 'text-xs', save: 'text-xs' },
  pdp:   { main: 'text-4xl font-black', strike: 'text-sm', save: 'text-sm' },
}

function formatZAR(amount: number) {
  return amount.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function PriceDisplay({
  displayPrice,
  originalPrice,
  isOnSale = false,
  discountPercent,
  size = 'card',
}: PriceDisplayProps) {
  const classes = SIZE_MAP[size]

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`leading-none ${classes.main} ${isOnSale ? 'text-red-600' : 'text-slate-900'}`}>
        R {formatZAR(displayPrice)}
      </span>
      {isOnSale && originalPrice != null && originalPrice > displayPrice && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`${classes.strike} text-stone-400 line-through`}>
            R {formatZAR(originalPrice)}
          </span>
          {discountPercent != null && discountPercent > 0 && (
            <span className={`${classes.save} font-bold text-emerald-600`}>
              Save {discountPercent}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}