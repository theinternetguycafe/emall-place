import { SpotlightStep } from '../components/seller/SpotlightTour'

/**
 * Checklist Tour Steps
 * 
 * Interactive tour that guides sellers through the setup checklist,
 * highlighting each step and explaining what to do next.
 */
export const CHECKLIST_TOUR_STEPS: SpotlightStep[] = [
  {
    id: 'checklist-intro',
    title: 'Welcome to Your Setup Checklist',
    body: 'We\'ll guide you through three essential steps to get your store live. Take the tour to see what\'s next.',
    selector: '[data-tour="setup-checklist"]',
    link: '/seller',
  },
  {
    id: 'checklist-step-store_created',
    title: 'Step 1: Create Your Store',
    body: 'You\'ve already created your store profile. Great start! This becomes your shop front where buyers see your brand.',
    selector: '[data-tour="checklist-step-store_created"]',
    link: '/seller',
  },
  {
    id: 'checklist-step-first_product',
    title: 'Step 2: Add Your First Product',
    body: 'Ready to list your first item? Click "Do this now" to create a product with photos, title, price, and description.',
    selector: '[data-tour="checklist-step-first_product"]',
    link: '/seller',
  },
  {
    id: 'checklist-step-tour_complete',
    title: 'Step 3: Take the Guided Tour',
    body: 'Once you\'ve added a product, we\'ll give you a quick tour of the order management features so you know how to handle sales.',
    selector: '[data-tour="checklist-step-tour_complete"]',
    link: '/seller',
  },
]
