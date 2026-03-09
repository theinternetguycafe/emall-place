# Seller Onboarding Tour - Code Changes (Side-by-Side)

## Change 1: Add Selector to Store Name Input

**File**: `src/pages/SellerDashboard.tsx` (Line ~195)

```tsx
❌ BEFORE:
            <form onSubmit={createStore} className="space-y-6" id="store-form-section">
              <Input
                label="Store Name"
                placeholder="My Artisan Shop"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                disabled={creatingStore}
              />

✅ AFTER:
            <form onSubmit={createStore} className="space-y-6" id="store-form-section">
              <Input
                label="Store Name"
                placeholder="My Artisan Shop"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                disabled={creatingStore}
                data-tour="store-name-input"
              />
```

**Impact**: Tour can now find this specific input via CSS selector `[data-tour="store-name-input"]`

---

## Change 2: Update Onboarding Step Interface & Step 0

**File**: `src/lib/onboarding.ts` (Line ~12 and ~23)

```tsx
❌ BEFORE:
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

✅ AFTER:
export interface OnboardingStep {
  id: string
  title: string
  description: string
  link?: string
  elementId?: string
  selector?: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'store-setup',
    title: 'Set up your store profile',
    description: 'Add store name and description. Buyers see this first.',
    link: '/seller',
    elementId: 'store-form-section',
    selector: '[data-tour="store-name-input"]'
  },
```

**Impact**: Step 0 now uses precise CSS selector as primary target, falls back to ID if needed

---

## Change 3: Smart Element Detection in Tour

**File**: `src/components/seller/SellerTour.tsx` (Line ~1-30)

### Part A: Imports + State

```tsx
❌ BEFORE:
import React, { useState, useEffect } from 'react'
import { ONBOARDING_STEPS, updateOnboardingProgress } from '../../lib/onboarding'
import { useAuth } from '../../contexts/AuthContext'
import { X, ArrowLeft, ArrowRight, SkipForward } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

interface SellerTourProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  currentStep?: number
}

export default function SellerTour({ isOpen, onClose, onComplete, currentStep = 0 }: SellerTourProps) {
  const { profile } = useAuth()
  const [step, setStep] = useState(currentStep)
  const [highlightBox, setHighlightBox] = useState<DOMRect | null>(null)
  const [completed, setCompleted] = useState<string[]>([])

  const currentStepData = ONBOARDING_STEPS[step]
  const isLastStep = step === ONBOARDING_STEPS.length - 1
  const isFirstStep = step === 0

✅ AFTER:
import React, { useState, useEffect } from 'react'
import { ONBOARDING_STEPS, updateOnboardingProgress } from '../../lib/onboarding'
import { useAuth } from '../../contexts/AuthContext'
import { X, ArrowLeft, ArrowRight, SkipForward, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

const DEBUG_TOUR = import.meta.env.DEV && false // Set to true to enable tour debugging

interface SellerTourProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  currentStep?: number
}

export default function SellerTour({ isOpen, onClose, onComplete, currentStep = 0 }: SellerTourProps) {
  const { profile } = useAuth()
  const [step, setStep] = useState(currentStep)
  const [highlightBox, setHighlightBox] = useState<DOMRect | null>(null)
  const [completed, setCompleted] = useState<string[]>([])
  const [elementNotFound, setElementNotFound] = useState(false)
  const [elementValue, setElementValue] = useState('')

  const currentStepData = ONBOARDING_STEPS[step]
  const isLastStep = step === ONBOARDING_STEPS.length - 1
  const isFirstStep = step === 0
```

**Changes**:
- Added `AlertCircle` icon import for fallback message
- Added `DEBUG_TOUR` flag for conditional logging
- Added state for `elementNotFound` (show warning when element missing)
- Added state for `elementValue` (track store name input value)

---

### Part B: useEffect - Track Input Changes

```tsx
❌ BEFORE:
  useEffect(() => {
    if (isOpen) {
      setStep(currentStep)
      updateHighlight()
      const handleResize = () => updateHighlight()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [isOpen, step])

✅ AFTER:
  useEffect(() => {
    if (isOpen) {
      setStep(currentStep)
      updateHighlight()
      const handleResize = () => updateHighlight()
      window.addEventListener('resize', handleResize)
      
      // Track input changes for Step 0 gating
      const trackInputChange = () => {
        updateHighlight()
      }
      document.addEventListener('input', trackInputChange)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        document.removeEventListener('input', trackInputChange)
      }
    }
  }, [isOpen, step])
```

**Impact**: Now re-runs `updateHighlight()` on every keystroke to refresh the tracked input value

---

### Part C: updateHighlight() - Smart Detection

```tsx
❌ BEFORE:
  const updateHighlight = () => {
    if (!currentStepData?.elementId) {
      setHighlightBox(null)
      return
    }

    const element = document.getElementById(currentStepData.elementId)
    if (element) {
      const rect = element.getBoundingClientRect()
      setHighlightBox(rect)
    } else {
      setHighlightBox(null)
    }
  }

✅ AFTER:
  const updateHighlight = () => {
    if (!currentStepData?.elementId && !currentStepData?.selector) {
      setHighlightBox(null)
      setElementNotFound(false)
      return
    }

    // Try selector first (more specific), fall back to elementId
    let element: HTMLElement | null = null
    const targetSelector = currentStepData.selector || `#${currentStepData.elementId}`
    
    try {
      element = document.querySelector(targetSelector) as HTMLElement
    } catch (e) {
      DEBUG_TOUR && console.warn(`[Tour] Invalid selector: ${targetSelector}`, e)
    }

    if (DEBUG_TOUR) {
      console.log(`[Tour Step ${step}] Target: ${currentStepData.id}`)
      console.log(`  Selector: ${targetSelector}`)
      console.log(`  Found: ${element ? 'YES' : 'NO'}`)
      if (element) {
        console.log(`  Visible: ${element.offsetParent !== null ? 'YES' : 'NO'}`)
        console.log(`  BBox: `, element.getBoundingClientRect())
        console.log(`  Value/Text: ${(element as any).value || element.textContent?.slice(0, 50)}`)
      }
    }

    if (element && element.offsetParent !== null) {
      // Element exists and is visible
      const rect = element.getBoundingClientRect()
      setHighlightBox(rect)
      setElementNotFound(false)
      
      // Track value for gating logic (Step 0: store name input)
      if (step === 0 && (element as HTMLInputElement).value) {
        setElementValue((element as HTMLInputElement).value)
      }
    } else {
      setHighlightBox(null)
      setElementNotFound(true)
      if (DEBUG_TOUR && element) {
        console.warn(`[Tour] Element exists but is hidden (offsetParent is null)`)
      }
    }
  }
```

**Changes**:
- Use `querySelector(selector)` instead of `getElementById()`
- Support both `selector` and `elementId`
- Check `offsetParent !== null` (hidden elements return null)
- Track input value for Step 0
- Guard all logs behind `DEBUG_TOUR` flag
- Set `elementNotFound` state for fallback UI

---

### Part D: handleNext() - Add Validation

```tsx
❌ BEFORE:
  const handleNext = async () => {
    const newCompleted = [...completed, currentStepData.id]
    setCompleted(newCompleted)

    if (profile?.id) {
      await updateOnboardingProgress(profile.id, step + 1, newCompleted)
    }

    if (isLastStep) {
      if (profile?.id) {
        await updateOnboardingProgress(profile.id, ONBOARDING_STEPS.length, newCompleted)
      }
      onComplete()
    } else {
      setStep(step + 1)
    }
  }

✅ AFTER:
  const handleNext = async () => {
    // Validation for Step 0: Store name must be provided
    if (step === 0 && !elementValue.trim()) {
      DEBUG_TOUR && console.log('[Tour] Step 0 gating: store name is empty, blocking progression')
      alert('Please enter a store name before proceeding.')
      return
    }

    const newCompleted = [...completed, currentStepData.id]
    setCompleted(newCompleted)

    if (profile?.id) {
      await updateOnboardingProgress(profile.id, step + 1, newCompleted)
    }

    if (isLastStep) {
      if (profile?.id) {
        await updateOnboardingProgress(profile.id, ONBOARDING_STEPS.length, newCompleted)
      }
      onComplete()
    } else {
      setStep(step + 1)
    }
  }

  const canProceedToNextStep = step !== 0 || elementValue.trim() !== ''
```

**Changes**:
- Check if Step 0 input is empty, block if so
- Show alert explaining why progression is blocked
- Add `canProceedToNextStep` computed variable for button state

---

### Part E: JSX - Fallback Warning + Disabled Button

```tsx
❌ BEFORE:
          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl font-black text-slate-900 mb-3">{currentStepData.title}</h3>
            <p className="text-sm text-stone-600 mb-8 leading-relaxed">{currentStepData.description}</p>

            {/* Helper Tips */}
            {step === 0 && (
              <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-900 font-medium">
                  💡 Store profile is what buyers see first. Make it count.
                </p>
              </div>
            )}
            ...
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                disabled={isFirstStep}
                ...
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                onClick={handleNext}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                {isLastStep ? 'Complete' : 'Next'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

✅ AFTER:
          {/* Content */}
          <div className="p-6">
            <h3 className="text-xl font-black text-slate-900 mb-3">{currentStepData.title}</h3>
            <p className="text-sm text-stone-600 mb-8 leading-relaxed">{currentStepData.description}</p>

            {/* Element Not Found Warning */}
            {elementNotFound && (
              <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-bold mb-1">Can't find this section</p>
                  <p className="text-xs">Make sure you've completed the previous step. The form or element should appear automatically.</p>
                </div>
              </div>
            )}

            {/* Helper Tips */}
            {step === 0 && (
              <div className="mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-900 font-medium">
                  💡 Store profile is what buyers see first. Make it count.
                </p>
              </div>
            )}
            ...
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                disabled={isFirstStep}
                ...
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                onClick={handleNext}
                disabled={!canProceedToNextStep}
                title={!canProceedToNextStep && step === 0 ? 'Please enter a store name first' : ''}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  !canProceedToNextStep
                    ? 'bg-blue-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLastStep ? 'Complete' : 'Next'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
```

**Changes**:
- Added amber warning box that shows when `elementNotFound` is true
- Disable Next button when `!canProceedToNextStep`
- Change button color to gray when disabled
- Add tooltip showing why button is disabled
- Add cursor: not-allowed styling

---

## Summary of Changes

| File | Change | Why |
|------|--------|-----|
| `SellerDashboard.tsx` | Added `data-tour="store-name-input"` | Precise selector for tour |
| `onboarding.ts` | Added `selector?` field to interface and Step 0 | Support CSS selectors |
| `SellerTour.tsx` | 10+ changes | Validation, detection, logging, gating |

**Total lines changed**: ~60 lines  
**New functionality**: Element detection + visibility check + input validation + logging  
**Breaking changes**: None - fully backward compatible

---

## Verification Checklist

Run these commands to verify everything is working:

```bash
# 1. Check for TypeScript errors
npm run build 2>&1 | grep -E "error TS"

# 2. Check for console warnings
npm run dev 2>&1 | head -50

# 3. Manual test:
#    - Login as seller
#    - Create store
#    - Click "Continue Tour"
#    - Verify Step 1 highlights store-name input
#    - Try clicking Next with empty input (should block)
#    - Enter store name (Next should enable)
#    - Proceed through remaining steps
```

All done! ✅
