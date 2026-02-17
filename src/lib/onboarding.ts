import { supabase } from './supabase'

export interface OnboardingProgress {
  user_id: string
  completed: boolean
  step_index: number
  completed_steps: string[]
  updated_at: string
}

export interface OnboardingStep {
  id: string
  title: string
  description: string
  link?: string
  elementId?: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'store-setup',
    title: 'Set up your store profile',
    description: 'Add store name and description. Buyers see this first.',
    link: '/seller',
    elementId: 'store-form-section'
  },
  {
    id: 'first-product',
    title: 'Create your first product',
    description: 'Add title, price, stock. This is what buyers will love.',
    link: '/seller/products/new',
    elementId: 'product-title-input'
  },
  {
    id: 'add-photos',
    title: 'Add clear photos',
    description: 'Good photos build trust. Upload at least one image per product.',
    link: '/seller/products/new',
    elementId: 'image-upload-section'
  },
  {
    id: 'category-details',
    title: 'Choose category and confirm details',
    description: 'Category helps buyers find your products. Description helps them decide.',
    link: '/seller/products/new',
    elementId: 'product-category-select'
  },
  {
    id: 'publish',
    title: 'Publish for review',
    description: 'Your product goes to admins for quick approval (24-48 hours).',
    link: '/seller/products/new',
    elementId: 'publish-button'
  },
  {
    id: 'learn-orders',
    title: 'Understand how orders work',
    description: 'Paid → Awaiting shipping → Mark as shipped. You control the flow.',
    link: '/seller',
    elementId: 'orders-tab'
  }
]

const DEBUG = import.meta.env.DEV

export async function getSellerOnboarding(userId: string): Promise<OnboardingProgress | null> {
  if (DEBUG) console.log('[Onboarding] fetching progress for', userId)
  
  try {
    const { data, error } = await supabase
      .from('seller_onboarding')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('[Onboarding] fetch error:', error)
      return null
    }
    
    if (DEBUG && data) console.log('[Onboarding] fetched progress:', data)
    return data || null
  } catch (err) {
    console.error('[Onboarding] unexpected error:', err)
    return null
  }
}

export async function initializeSellerOnboarding(userId: string): Promise<OnboardingProgress | null> {
  if (DEBUG) console.log('[Onboarding] initializing for', userId)
  
  try {
    const { data, error } = await supabase
      .from('seller_onboarding')
      .insert({
        user_id: userId,
        completed: false,
        step_index: 0,
        completed_steps: []
      })
      .select()
      .single()
    
    if (error) {
      console.error('[Onboarding] init error:', error)
      return null
    }
    
    if (DEBUG) console.log('[Onboarding] initialized:', data)
    return data
  } catch (err) {
    console.error('[Onboarding] unexpected error:', err)
    return null
  }
}

export async function updateOnboardingProgress(
  userId: string,
  stepIndex: number,
  completedSteps: string[]
): Promise<OnboardingProgress | null> {
  if (DEBUG) console.log('[Onboarding] updating progress:', { userId, stepIndex, completedSteps })
  
  try {
    const { data, error } = await supabase
      .from('seller_onboarding')
      .upsert({
        user_id: userId,
        step_index: stepIndex,
        completed_steps: completedSteps,
        completed: completedSteps.length === ONBOARDING_STEPS.length,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('[Onboarding] update error:', error)
      return null
    }
    
    if (DEBUG) console.log('[Onboarding] updated:', data)
    return data
  } catch (err) {
    console.error('[Onboarding] unexpected error:', err)
    return null
  }
}

export async function completeOnboarding(userId: string): Promise<OnboardingProgress | null> {
  if (DEBUG) console.log('[Onboarding] completing for', userId)
  
  try {
    const { data, error } = await supabase
      .from('seller_onboarding')
      .update({
        completed: true,
        step_index: ONBOARDING_STEPS.length,
        completed_steps: ONBOARDING_STEPS.map(s => s.id),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      console.error('[Onboarding] complete error:', error)
      return null
    }
    
    if (DEBUG) console.log('[Onboarding] completed:', data)
    return data
  } catch (err) {
    console.error('[Onboarding] unexpected error:', err)
    return null
  }
}
