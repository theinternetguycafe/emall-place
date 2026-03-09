/**
 * Completion Celebration
 * 
 * Full-screen celebration modal shown when seller completes all onboarding steps.
 * Features confetti animation and motivational messaging.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'

interface CompletionCelebrationProps {
  isVisible: boolean
  onDismiss: () => void
}

export function CompletionCelebration({ isVisible, onDismiss }: CompletionCelebrationProps) {
  const navigate = useNavigate()
  const [hasConfetti, setHasConfetti] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setHasConfetti(true)
      // Create confetti effect
      createConfetti()

      // Handle Escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onDismiss()
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isVisible, onDismiss])

  const createConfetti = () => {
    if (typeof window === 'undefined') return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.style.position = 'fixed'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '999'
    document.body.appendChild(canvas)

    const particles: Particle[] = []
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

    // Create particles
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 5 + 5,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 2
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.2 // gravity
        p.life -= 0.01

        if (p.life <= 0) {
          particles.splice(i, 1)
        } else {
          ctx.globalAlpha = p.life
          ctx.fillStyle = p.color
          ctx.fillRect(p.x, p.y, p.size, p.size)
          ctx.globalAlpha = 1
        }
      })

      if (particles.length > 0) {
        requestAnimationFrame(animate)
      } else {
        canvas.remove()
      }
    }

    animate()
  }

  if (!isVisible) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only dismiss if clicking the backdrop, not the modal itself
    if (e.target === e.currentTarget) {
      onDismiss()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-[3rem] p-12 max-w-md w-full shadow-2xl animate-scaleIn border-2 border-white" onClick={(e) => e.stopPropagation()}>
        {/* Sparkle Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <Sparkles className="h-16 w-16 text-amber-400 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-3xl">✨</div>
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-black text-slate-900 text-center mb-4 tracking-tight">
          You're All Set!
        </h1>

        {/* Subheading */}
        <p className="text-lg text-slate-700 text-center mb-8 font-semibold">
          Your store is live and ready to start accepting orders. Great work! 🎉
        </p>

        {/* Achievements */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: '🏪', label: 'Store Created' },
            { icon: '📦', label: 'Product Listed' },
            { icon: '🎓', label: 'Tour Complete' }
          ].map((achievement) => (
            <div
              key={achievement.label}
              className="flex flex-col items-center p-3 bg-white rounded-2xl border border-emerald-100 shadow-sm"
            >
              <span className="text-2xl mb-1">{achievement.icon}</span>
              <span className="text-[10px] font-black text-center text-slate-600 uppercase tracking-tight">
                {achievement.label}
              </span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
              navigate('/seller')
            }}
            className="w-full rounded-2xl py-4 gap-2 text-lg font-black shadow-lg shadow-emerald-200"
          >
            Go to Dashboard
            <ArrowRight className="h-5 w-5" />
          </Button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            className="w-full px-4 py-3 rounded-2xl font-black text-slate-600 hover:bg-white/50 transition-colors text-sm uppercase tracking-wider"
          >
            Continue Shopping
          </button>
        </div>

        {/* Motivational message */}
        <p className="text-center text-xs text-slate-500 mt-6 font-medium">
          💡 Tip: Check your orders regularly and respond quickly to build customer trust!
        </p>
      </div>
    </div>
  )
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}
