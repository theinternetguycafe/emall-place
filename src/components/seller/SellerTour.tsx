import React, { useState, useEffect } from 'react'
import { ONBOARDING_STEPS, updateOnboardingProgress } from '../../lib/onboarding'
import { useAuth } from '../../contexts/AuthContext'
import { X, ArrowLeft, ArrowRight, SkipForward } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

interface SellerTourProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  currentStep?: number
}

export default function SellerTour({ isOpen, onClose, onComplete, currentStep = 0 }: SellerTourProps) {
  const { profile } = useAuth()
  const [step, setStep] = useState(currentStep)
  const [highlightBox, setHighlightBox] = useState<DOMRect | null>(null)
  const [completed, setCompleted] = useState<string[]>([])

  const currentStepData = ONBOARDING_STEPS[step]
  const isLastStep = step === ONBOARDING_STEPS.length - 1
  const isFirstStep = step === 0

  useEffect(() => {
    if (isOpen) {
      setStep(currentStep)
      updateHighlight()
      const handleResize = () => updateHighlight()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [isOpen, step])

  const updateHighlight = () => {
    if (!currentStepData?.elementId) {
      setHighlightBox(null)
      return
    }

    const element = document.getElementById(currentStepData.elementId)
    if (element) {
      const rect = element.getBoundingClientRect()
      setHighlightBox(rect)
    } else {
      setHighlightBox(null)
    }
  }

  const handleNext = async () => {
    const newCompleted = [...completed, currentStepData.id]
    setCompleted(newCompleted)

    if (profile?.id) {
      await updateOnboardingProgress(profile.id, step + 1, newCompleted)
    }

    if (isLastStep) {
      if (profile?.id) {
        await updateOnboardingProgress(profile.id, ONBOARDING_STEPS.length, newCompleted)
      }
      onComplete()
    } else {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setStep(step - 1)
    }
  }

  const handleSkip = async () => {
    if (profile?.id) {
      await updateOnboardingProgress(profile.id, step, completed)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] pointer-events-none">
      {/* Semi-transparent Overlay */}
      {highlightBox && (
        <div
          className="absolute inset-0 bg-black/50 pointer-events-auto"
          onClick={handleSkip}
        >
          {/* Highlight Box */}
          <div
            className="absolute border-4 border-blue-400 rounded-xl shadow-2xl shadow-blue-500/50 transition-all duration-300 z-50"
            style={{
              top: `${highlightBox.top - 8}px`,
              left: `${highlightBox.left - 8}px`,
              width: `${highlightBox.width + 16}px`,
              height: `${highlightBox.height + 16}px`,
              pointerEvents: 'none'
            }}
          />
        </div>
      )}

      {/* Tour Card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto px-4 py-6">
        <Card className="max-w-md w-full bg-white shadow-2xl rounded-3xl border-2 border-slate-900">
          {/* Header */}
          <div className="relative p-6 pb-4 border-b border-stone-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-black text-blue-600">
                  {step + 1}
                </div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                  Step {step + 1} of {ONBOARDING_STEPS.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-lg transition-all text-stone-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${((step + 1) / ONBOARDING_STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl font-black text-slate-900 mb-3">{currentStepData.title}</h3>
            <p className="text-sm text-stone-600 mb-8 leading-relaxed">{currentStepData.description}</p>

            {/* Helper Tips */}
            {step === 0 && (
              <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-900 font-medium">
                  💡 Store profile is what buyers see first. Make it count.
                </p>
              </div>
            )}
            {step === 1 && (
              <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-900 font-medium">
                  💡 You can add more products anytime from the Create button.
                </p>
              </div>
            )}
            {step === 2 && (
              <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-900 font-medium">
                  💡 Clear photos increase sales by up to 40%. Natural lighting works best.
                </p>
              </div>
            )}
            {step === 4 && (
              <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-900 font-medium">
                  💡 Admins review products for spam/policy (24-48 hours). Legit items sail through.
                </p>
              </div>
            )}
            {step === 5 && (
              <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-900 font-medium">
                  💡 Payment → Awaiting shipping → Shipped. Control your own fulfillment.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                disabled={isFirstStep}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  isFirstStep
                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    : 'bg-stone-100 text-slate-900 hover:bg-stone-200'
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {isLastStep ? 'Complete' : 'Next'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Skip Link */}
            <button
              onClick={handleSkip}
              className="w-full mt-3 py-2 text-xs font-bold text-stone-500 hover:text-slate-900 uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <SkipForward className="h-4 w-4" />
              Skip for now
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
