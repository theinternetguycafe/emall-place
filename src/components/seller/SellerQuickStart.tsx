import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getSellerOnboarding, ONBOARDING_STEPS, updateOnboardingProgress } from '../../lib/onboarding'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'

interface SellerQuickStartProps {
  onStartTour?: () => void
  onboarding: any
}

export default function SellerQuickStart({ onStartTour, onboarding }: SellerQuickStartProps) {
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  useEffect(() => {
    if (onboarding) {
      setCompletedSteps(onboarding.completed_steps || [])
      setCompleted(onboarding.completed || false)
      setLoading(false)
    }
  }, [onboarding])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    )
  }

  const progressPercent = Math.floor((completedSteps.length / ONBOARDING_STEPS.length) * 100)

  if (completed) {
    return (
      <Card className="p-8 mb-12 border-emerald-200 bg-emerald-50">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-emerald-900 mb-2">🎉 Welcome to the Seller Hub!</h2>
            <p className="text-emerald-700 font-medium mb-6">
              You've completed the quick-start tour. You're all set to start selling on eMall-Place. 
              Build something brilliant.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/product/new">
                <Button className="rounded-full">
                  Create Product
                </Button>
              </Link>
              <button onClick={onStartTour} className="text-emerald-700 font-bold hover:underline flex items-center gap-2">
                Review tour
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="hidden sm:flex h-16 w-16 rounded-full bg-emerald-100 items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-8 mb-12 border-blue-200 bg-blue-50">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Seller Quick Start</h2>
        <p className="text-stone-600 mb-6">
          New here? We'll guide you through creating and selling your first product.
        </p>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">Progress</span>
            <span className="text-xs font-black text-blue-700">
              {completedSteps.length}/{ONBOARDING_STEPS.length}
            </span>
          </div>
          <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {completedSteps.length === 0 ? (
            <Button onClick={onStartTour} className="rounded-full gap-2">
              Start Tour Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={onStartTour} className="rounded-full gap-2" variant="outline">
              Continue Tour
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" className="rounded-full" disabled>
            {completedSteps.length === ONBOARDING_STEPS.length
              ? '✓ Complete'
              : `${completedSteps.length} of ${ONBOARDING_STEPS.length} done`}
          </Button>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3 pt-6 border-t border-blue-100">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Steps</p>
        {ONBOARDING_STEPS.map((step, idx) => {
          const isCompleted = completedSteps.includes(step.id)
          const isNext = idx === completedSteps.length

          return (
            <Link
              key={step.id}
              to={step.link || '/seller'}
              className={`flex items-start gap-3 p-3 rounded-2xl transition-all ${
                isCompleted
                  ? 'bg-white/60 hover:bg-white'
                  : isNext
                  ? 'bg-white border border-blue-200 hover:border-blue-400'
                  : 'bg-white/40 opacity-75'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isNext ? 'text-blue-600' : 'text-stone-300'}`} />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-900">{step.title}</div>
                <p className="text-xs text-stone-600">{step.description}</p>
              </div>
              {isNext && <Badge className="flex-shrink-0 bg-blue-600 text-white">Next</Badge>}
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
