import React, { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface SaleCountdownProps {
  endsAt: string
  className?: string
}

function getTimeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return { h, m, s, totalMs: diff }
}

function pad(n: number) { return String(n).padStart(2, '0') }

export default function SaleCountdown({ endsAt, className = '' }: SaleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endsAt))

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(endsAt)), 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (!timeLeft) return null

  const isUrgent = timeLeft.totalMs < 3600000 // < 1 hour

  return (
    <div className={`flex items-center gap-2 ${isUrgent ? 'text-red-600 bg-red-50 border border-red-100' : 'text-orange-600 bg-orange-50 border border-orange-100'} px-4 py-2 rounded-xl text-sm font-bold w-fit ${className}`}>
      <Clock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>
        {timeLeft.h > 0
          ? `Sale ends in ${timeLeft.h}h ${pad(timeLeft.m)}m`
          : `Only ${pad(timeLeft.m)}m ${pad(timeLeft.s)}s left!`
        }
      </span>
    </div>
  )
}