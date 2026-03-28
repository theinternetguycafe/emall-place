import React from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, MapPin, ShieldCheck, ArrowRight } from 'lucide-react'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'

export function SellerCautionNote() {
  const { profile } = useAuth()
  const { nextStep, isComplete, loading } = useOnboarding()

  if (loading || !profile || profile.role !== 'seller' || isComplete || !nextStep) {
    return null
  }

  // Define icons based on step
  const getStepIcon = (id: string) => {
    switch (id) {
      case 'location_pinned': return <MapPin className="text-rose-500" size={20} />
      case 'kyc_submitted': return <ShieldCheck className="text-rose-500" size={20} />
      default: return <AlertCircle className="text-rose-500" size={20} />
    }
  }

  return (
    <div className="bg-rose-50 border-y border-rose-100 py-3 px-4 sm:px-6 relative z-30">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl shadow-sm">
            {getStepIcon(nextStep.id)}
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-900 leading-none mb-1">
              Action Required: {nextStep.title}
            </h4>
            <p className="text-[11px] text-rose-700 font-medium leading-tight">
              {nextStep.description} This is required for marketplace visibility.
            </p>
          </div>
        </div>

        <Link to={nextStep.actionPath} className="flex-shrink-0">
          <Button 
            size="sm" 
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 group"
          >
            Complete Setup <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
