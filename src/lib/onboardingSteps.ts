/**
 * Onboarding Steps Configuration
 * 
 * Single source of truth for all onboarding flows.
 * Seller: 3 steps (store_created, first_product, tour_complete)
 * Buyer: 2 steps (welcome_seen, first_purchase)
 */

export interface OnboardingStep {
  id: string
  title: string
  description: string
  page: string // which page/route this step is associated with
  actionLabel: string
  actionPath: string
  mandatory: boolean
  role: 'seller' | 'buyer'
  selector?: string // CSS selector for spotlight tour
}

/**
 * Seller Onboarding Steps
 * - store_created: First step, user must create a store (mandatory)
 * - first_product: Add first product to store (mandatory)
 * - tour_complete: Take the interactive tour (optional, nudge only)
 */
export const SELLER_STEPS: OnboardingStep[] = [
  {
    id: 'store_created',
    title: 'Create Your Store',
    description: 'Enter your store name in the panel below to get started.',
    page: '/seller',
    actionLabel: 'Set Up Now',
    actionPath: '/seller',
    mandatory: true,
    role: 'seller',
    selector: '[data-onboarding="store-name"]'
  },
  {
    id: 'location_pinned',
    title: 'Pin Your Location',
    description: 'Mark your store on the map so buyers can find you nearby.',
    page: '/seller',
    actionLabel: 'Set Pin',
    actionPath: '/seller',
    mandatory: true,
    role: 'seller',
    selector: '[data-tour="seller-shell"]'
  },
  {
    id: 'kyc_submitted',
    title: 'Identity Verification',
    description: 'Submit your KYC documents to build trust and enable payouts.',
    page: '/seller/onboarding',
    actionLabel: 'Verify Now',
    actionPath: '/seller/onboarding',
    mandatory: true,
    role: 'seller'
  },
  {
    id: 'first_product',
    title: 'Add Your First Product',
    description: 'Showcase your first craft item to potential customers.',
    page: '/seller',
    actionLabel: 'Add Product',
    actionPath: '/seller/products/new',
    mandatory: true,
    role: 'seller',
    selector: '[data-onboarding="add-product-btn"]'
  },
  {
    id: 'tour_complete',
    title: 'Take the Interactive Tour',
    description: 'Learn how to manage your store, orders, and grow your business.',
    page: '/seller',
    actionLabel: 'Start Tour',
    actionPath: '/seller',
    mandatory: false,
    role: 'seller',
    selector: '[data-onboarding="orders-tab"]'
  }
]

/**
 * Buyer Onboarding Steps
 * - welcome_seen: Welcome message to new buyers (optional, informational)
 * - first_purchase: Encourage first purchase (optional, nudge)
 */
export const BUYER_STEPS: OnboardingStep[] = [
  {
    id: 'welcome_seen',
    title: 'Welcome to Our Marketplace',
    description: 'Discover unique handcrafted products from talented artisans in your community.',
    page: '/',
    actionLabel: 'Explore',
    actionPath: '/',
    mandatory: false,
    role: 'buyer'
  },
  {
    id: 'first_purchase',
    title: 'Make Your First Purchase',
    description: 'Support local artisans by buying your first handcrafted item.',
    page: '/',
    actionLabel: 'Browse Shops',
    actionPath: '/',
    mandatory: false,
    role: 'buyer'
  }
]

/**
 * Get all steps for a role
 */
export const getStepsForRole = (role: 'seller' | 'buyer'): OnboardingStep[] => {
  return role === 'seller' ? SELLER_STEPS : BUYER_STEPS
}

/**
 * Get a specific step by ID and role
 */
export const getStepById = (stepId: string, role: 'seller' | 'buyer'): OnboardingStep | undefined => {
  const steps = getStepsForRole(role)
  return steps.find(s => s.id === stepId)
}

/**
 * Check if a step exists and is mandatory
 */
export const isStepMandatory = (stepId: string, role: 'seller' | 'buyer'): boolean => {
  const step = getStepById(stepId, role)
  return step?.mandatory ?? false
}
