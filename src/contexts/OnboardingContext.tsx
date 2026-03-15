/**
 * Onboarding Context
 * 
 * Global state provider for onboarding progress across the app.
 * Fetches once on mount when profile is available.
 * Refreshes automatically after step completions/skips.
 */

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { OnboardingStep } from '../lib/onboardingSteps'
import {
  getProgress,
  completeStep as dbCompleteStep,
  skipStep as dbSkipStep,
  getNextStep as dbGetNextStep,
  isOnboardingComplete as dbIsOnboardingComplete,
  isStepDone as dbIsStepDone
} from '../lib/onboarding'

interface OnboardingContextValue {
  completedSteps: string[]
  nextStep: OnboardingStep | null
  isComplete: boolean
  loading: boolean
  celebrationPending: boolean
  completeStep: (stepId: string) => Promise<void>
  skipStep: (stepId: string) => Promise<void>
  dismissCelebration: () => void
  isStepDone: (stepId: string) => Promise<boolean>
  refreshProgress: () => Promise<void>
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

const DEFAULT_VALUE: OnboardingContextValue = {
  completedSteps: [],
  nextStep: null,
  isComplete: true, // default to complete so nudge doesn't show if context fails
  loading: true,
  celebrationPending: false,
  completeStep: async () => {},
  skipStep: async () => {},
  dismissCelebration: () => {},
  isStepDone: async () => false,
  refreshProgress: async () => {}
}

interface OnboardingProviderProps {
  children: React.ReactNode
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { profile } = useAuth()
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [nextStep, setNextStep] = useState<OnboardingStep | null>(null)
  const [isComplete, setIsComplete] = useState(true)
  const [loading, setLoading] = useState(true)
  const [celebrationPending, setCelebrationPending] = useState(false)
  const previousIsCompleteRef = React.useRef(true)

  // Determine user's role
  const userRole = profile?.role === 'seller' ? 'seller' : 'buyer'

  // Detect transition from incomplete to complete
  useEffect(() => {
    if (!loading && isComplete && !previousIsCompleteRef.current) {
      // Just became complete
      setCelebrationPending(true)
    }
    previousIsCompleteRef.current = isComplete
  }, [isComplete, loading])

  // Fetch initial progress and next step
  const refreshProgress = async () => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    try {
      const [completed, next, complete] = await Promise.all([
        getProgress(profile.id, userRole),
        dbGetNextStep(profile.id, userRole),
        dbIsOnboardingComplete(profile.id, userRole)
      ])

      setCompletedSteps(completed)
      setNextStep(next)
      setIsComplete(complete)
    } catch (err) {
      console.error('Error refreshing onboarding progress:', err)
      // Fail gracefully - assume complete so nudge doesn't persist
      setIsComplete(true)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch on mount and when profile/role changes
  useEffect(() => {
    refreshProgress()
  }, [profile?.id, userRole])

  // Action handlers
  const handleCompleteStep = async (stepId: string) => {
    if (!profile?.id) return

    try {
      await dbCompleteStep(profile.id, userRole, stepId)
      await refreshProgress()
    } catch (err) {
      console.error('Error completing step:', err)
      throw err
    }
  }

  const handleSkipStep = async (stepId: string) => {
    if (!profile?.id) return

    try {
      await dbSkipStep(profile.id, userRole, stepId)
      await refreshProgress()
    } catch (err) {
      console.error('Error skipping step:', err)
      throw err
    }
  }

  const handleIsStepDone = async (stepId: string): Promise<boolean> => {
    if (!profile?.id) return false

    try {
      return await dbIsStepDone(profile.id, userRole, stepId)
    } catch (err) {
      console.error('Error checking step status:', err)
      return false
    }
  }

  const handleDismissCelebration = () => {
    setCelebrationPending(false)
  }

  const value: OnboardingContextValue = {
    completedSteps,
    nextStep,
    isComplete,
    loading,
    celebrationPending,
    completeStep: handleCompleteStep,
    skipStep: handleSkipStep,
    dismissCelebration: handleDismissCelebration,
    isStepDone: handleIsStepDone,
    refreshProgress
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext)
  if (!context) {
    return DEFAULT_VALUE
  }
  return context
}
