/**
 * Onboarding Database Layer
 * 
 * Pure Supabase queries with no React dependencies.
 * All operations are idempotent via upsert with unique constraint.
 */

import { supabase } from './supabase'
import { getStepsForRole, getStepById } from './onboardingSteps'

export interface OnboardingProgress {
  id: string
  user_id: string
  role: 'seller' | 'buyer'
  step_id: string
  completed_at: string | null
  skipped: boolean
  created_at: string
  updated_at: string
}

/**
 * Get all completed and skipped steps for a user role
 * Returns array of step IDs that are either completed or skipped
 */
export const getProgress = async (
  userId: string,
  role: 'seller' | 'buyer'
): Promise<string[]> => {
  const { data, error } = await supabase
    .from('onboarding_progress')
    .select('step_id')
    .eq('user_id', userId)
    .eq('role', role)
    .or('completed_at.not.is.null,skipped.eq.true')

  if (error) {
    console.error('Error fetching onboarding progress:', error)
    return []
  }

  return (data || []).map(row => row.step_id)
}

/**
 * Mark a step as completed
 * Idempotent: safe to call multiple times (upsert)
 */
export const completeStep = async (
  userId: string,
  role: 'seller' | 'buyer',
  stepId: string
): Promise<void> => {
  const { error } = await supabase
    .from('onboarding_progress')
    .upsert(
      {
        user_id: userId,
        role,
        step_id: stepId,
        completed_at: new Date().toISOString(),
        skipped: false
      },
      {
        onConflict: 'user_id,step_id'
      }
    )

  if (error) {
    console.error('Error completing onboarding step:', error)
    throw error
  }
}

/**
 * Skip a step (typically optional steps)
 * Idempotent: safe to call multiple times (upsert)
 */
export const skipStep = async (
  userId: string,
  role: 'seller' | 'buyer',
  stepId: string
): Promise<void> => {
  const { error } = await supabase
    .from('onboarding_progress')
    .upsert(
      {
        user_id: userId,
        role,
        step_id: stepId,
        completed_at: null,
        skipped: true
      },
      {
        onConflict: 'user_id,step_id'
      }
    )

  if (error) {
    console.error('Error skipping onboarding step:', error)
    throw error
  }
}

/**
 * Get the next incomplete step for a user role
 * Returns the first mandatory step that's not completed/skipped
 * Returns null if all mandatory steps are done
 */
export const getNextStep = async (
  userId: string,
  role: 'seller' | 'buyer'
) => {
  const completedSteps = await getProgress(userId, role)
  const allSteps = getStepsForRole(role)

  // Find first mandatory step that hasn't been completed or skipped
  for (const step of allSteps) {
    if (step.mandatory && !completedSteps.includes(step.id)) {
      return step
    }
  }

  // No mandatory steps remaining; return first optional incomplete step
  for (const step of allSteps) {
    if (!step.mandatory && !completedSteps.includes(step.id)) {
      return step
    }
  }

  // All steps done
  return null
}

/**
 * Check if onboarding is complete for a user role
 * Complete = all mandatory steps are either completed or skipped
 */
export const isOnboardingComplete = async (
  userId: string,
  role: 'seller' | 'buyer'
): Promise<boolean> => {
  const completedSteps = await getProgress(userId, role)
  const allSteps = getStepsForRole(role)

  // Check if all mandatory steps are in completedSteps
  const allMandatoryDone = allSteps
    .filter(s => s.mandatory)
    .every(s => completedSteps.includes(s.id))

  return allMandatoryDone
}

/**
 * Check if a specific step is done (completed or skipped)
 */
export const isStepDone = async (
  userId: string,
  role: 'seller' | 'buyer',
  stepId: string
): Promise<boolean> => {
  const completedSteps = await getProgress(userId, role)
  return completedSteps.includes(stepId)
}
