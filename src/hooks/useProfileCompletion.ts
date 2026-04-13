import { useAuthStore } from '../store/useAuthStore'

/**
 * Returns a 0-100 seller profile completion score.
 * Useful for banners and progress indicators in the seller dashboard.
 *
 * 25 pts each for: store_name, latitude set, KYC started, onboarding_completed
 */
export function useProfileCompletion(): number {
  const { sellerProfile } = useAuthStore()

  if (!sellerProfile) return 0

  let score = 0
  if (sellerProfile.store_name)                       score += 25
  if (sellerProfile.latitude)                         score += 25
  if (sellerProfile.kyc_status !== 'not_started')     score += 25
  if (sellerProfile.onboarding_completed)             score += 25

  return score
}
