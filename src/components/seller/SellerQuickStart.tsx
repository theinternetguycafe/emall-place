import React, { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'

interface SellerQuickStartProps {
  onStartTour?: () => void
}

export default function SellerQuickStart({ onStartTour }: SellerQuickStartProps) {
  const { profile } = useAuth()
  const { completedSteps, nextStep, isComplete, loading } = useOnboarding()
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    setCompleted(isComplete)
  }, [isComplete])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    )
  }

  // Only show for sellers
  if (!profile || profile.role !== 'seller') {
    return null
  }

  const totalSteps = 3
  const progressPercent = Math.floor((completedSteps.length / totalSteps) * 100)

  if (completed) {
    return (
      <Card className="p-8 mb-12 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-emerald-900 mb-2">🎉 Onboarding Complete!</h2>
            <p className="text-emerald-800 font-medium mb-6">
              You're all set to start selling. Your store is live and ready for customers. 
              Create more products or manage your orders below.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/seller/products/new">
                <Button className="rounded-full">
                  Create Another Product
                </Button>
              </Link>
              {onStartTour && (
                <button 
                  onClick={onStartTour} 
                  className="text-emerald-700 font-bold hover:text-emerald-900 flex items-center gap-2"
                >
                  Review Dashboard Tour
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="hidden sm:flex h-16 w-16 rounded-full bg-emerald-100 items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
        </div>
      </Card>
    )
  }

  return null
}
