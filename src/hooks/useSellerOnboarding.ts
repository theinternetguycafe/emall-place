import { useAuthStore } from '../store/useAuthStore'

export type SellerStep =
  | 'not_seller'
  | 'start'
  | 'store'
  | 'location'
  | 'kyc'
  | 'finalize'
  | 'done'

interface SellerOnboardingResult {
  step: SellerStep
  /** 0-100 progress through onboarding */
  progress: number
  /** Human-readable label for the current step */
  label: string
}

const STEP_META: Record<SellerStep, { progress: number; label: string }> = {
  not_seller: { progress: 0, label: 'Not a seller' },
  start:      { progress: 5,  label: 'Start setup' },
  store:      { progress: 20, label: 'Set up your store' },
  location:   { progress: 40, label: 'Pin your location' },
  kyc:        { progress: 60, label: 'ID Verification' },
  finalize:   { progress: 80, label: 'Finalize submission' },
  done:       { progress: 100, label: 'All done!' },
}

/**
 * Derives the seller's current onboarding step from global auth state.
 * Does NOT make any API calls — pure computation from Zustand store.
 *
 * Note: This hook is distinct from `useOnboarding` in OnboardingContext,
 * which manages the UI tour/checklist system.
 */
export function useSellerOnboarding(): SellerOnboardingResult {
  const { sellerProfile, role } = useAuthStore()

  let step: SellerStep

  if (role !== 'seller')                                           step = 'not_seller'
  else if (!sellerProfile)                                         step = 'start'
  else if (!sellerProfile.store_name)                              step = 'store'
  else if (!sellerProfile.latitude)                                step = 'location'
  else if (sellerProfile.kyc_status === 'not_started')             step = 'kyc'
  else if (!sellerProfile.onboarding_completed)                    step = 'finalize'
  else                                                             step = 'done'

  return { step, ...STEP_META[step] }
}
