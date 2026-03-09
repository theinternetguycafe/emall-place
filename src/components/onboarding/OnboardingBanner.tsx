/**
 * Onboarding Banner
 * 
 * Fixed-position persistent nudge that shows the next incomplete step.
 * Non-blocking, fully dismissible (if optional).
 * Appears below navbar, slides in from bottom with CSS animation.
 */

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { useTour } from '../../contexts/TourContext'

export function OnboardingBanner() {
  const { nextStep, skipStep, isComplete } = useOnboarding()
  const { startTour } = useTour()
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  // Show only if there's a next step and not complete
  const shouldShow = nextStep && !isComplete && isVisible

  useEffect(() => {
    // Reset visibility when nextStep changes
    setIsVisible(true)
    setIsAnimatingOut(false)
  }, [nextStep])

  const handleDismiss = async () => {
    if (!nextStep) return

    // Only allow dismissal for optional steps
    if (!nextStep.mandatory) {
      setIsAnimatingOut(true)
      try {
        await skipStep(nextStep.id)
      } catch (err) {
        console.error('Error skipping step:', err)
        setIsAnimatingOut(false)
      }
    }
  }

  const handlePrimaryAction = () => {
    if (!nextStep) return

    if (nextStep.id === 'tour_complete') {
      startTour()
    }
  }

  if (!shouldShow) {
    return null
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
        isAnimatingOut ? 'opacity-0 translate-y-full' : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Banner Container */}
      <div
        className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-t border-slate-700 shadow-2xl"
        style={{
          animation: isAnimatingOut ? 'none' : 'slideUp 0.4s ease-out'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-1">
                {nextStep.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                {nextStep.description}
              </p>
            </div>

            {/* Action Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {nextStep.id === 'tour_complete' ? (
                <button
                  onClick={handlePrimaryAction}
                  className="px-4 py-2 sm:px-6 sm:py-2.5 bg-white text-slate-900 text-xs sm:text-sm font-black uppercase tracking-wider rounded-lg hover:bg-slate-100 transition-colors shadow-lg"
                >
                  {nextStep.actionLabel}
                </button>
              ) : (
                <Link to={nextStep.actionPath}>
                  <button
                    className="px-4 py-2 sm:px-6 sm:py-2.5 bg-white text-slate-900 text-xs sm:text-sm font-black uppercase tracking-wider rounded-lg hover:bg-slate-100 transition-colors shadow-lg"
                  >
                    {nextStep.actionLabel}
                  </button>
                </Link>
              )}

              {/* Dismiss Button - Only for Optional Steps */}
              {!nextStep.mandatory && (
                <button
                  onClick={handleDismiss}
                  className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                  aria-label="Dismiss"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
