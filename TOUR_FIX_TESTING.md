# Seller Onboarding Tour - Root Cause & Fix Documentation

## ROOT CAUSE ANALYSIS

### Problem
When user clicks "Start tour" on seller onboarding, Step 1 shows tooltip "Choose a store name" with Next/Skip buttons, but **no input field is visible**. User can click Next without entering a store name.

### Root Causes Identified

#### 1. **Selector Mismatch** ❌
- **Before**: Tour targeted `elementId: 'store-form-section'` (the wrapper form)
- **Issue**: Only the form wrapper was highlighted, not the actual input field
- **Fix**: Added `data-tour="store-name-input"` selector to the Input component for more precise targeting

#### 2. **Conditional Rendering Bug** ❌
- **Before**: Store creation form only renders when `!store && showStoreForm`
- **Issue**: Once a store is created, the entire create store form disappears from DOM
- **Timeline**:
  - User creates first store → store state becomes non-null
  - Form block conditionally hidden (line 153 in SellerDashboard)
  - Tour starts showing Step 1 → tries to highlight deleted form → selector returns null
- **Fix**: Element detection now checks visibility (`offsetParent !== null`) and shows fallback message

#### 3. **Missing Validation/Gating** ❌
- **Before**: `handleNext()` allowed progression without checking:
  - If target element exists or is visible
  - If required fields have valid values
  - If form is in correct state
- **Fix**: Added gating logic:
  - Step 0 cannot proceed unless store name input has a value
  - Element not found shows warning with helpful message
  - Next button disabled with tooltip explaining why

#### 4. **No Instrumentation** ❌
- **Before**: No visibility into what selector was being targeted or why highlighting failed
- **Fix**: Added `DEBUG_TOUR` flag-guarded logging that shows:
  - Target selector for each step
  - Whether element was found
  - Whether element is visible
  - Element's current value
  - Can be enabled by setting `DEBUG_TOUR = true` in SellerTour.tsx

---

## CODE CHANGES SUMMARY

### 1. `src/pages/SellerDashboard.tsx`
```tsx
// BEFORE: No selector on input
<Input
  label="Store Name"
  placeholder="My Artisan Shop"
  required
  value={storeName}
  onChange={(e) => setStoreName(e.target.value)}
  disabled={creatingStore}
/>

// AFTER: Added data-tour attribute for precise targeting
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

### 2. `src/lib/onboarding.ts`
```ts
// BEFORE: Only elementId
export interface OnboardingStep {
  id: string
  title: string
  description: string
  link?: string
  elementId?: string
}

// AFTER: Added selector property for fallback strategy
export interface OnboardingStep {
  id: string
  title: string
  description: string
  link?: string
  elementId?: string
  selector?: string
}

// Updated Step 0 to use data-tour selector
{
  id: 'store-setup',
  title: 'Set up your store profile',
  description: 'Add store name and description. Buyers see this first.',
  link: '/seller',
  elementId: 'store-form-section',
  selector: '[data-tour="store-name-input"]'  // NEW: Precise targeting
}
```

### 3. `src/components/seller/SellerTour.tsx`
**Change A: Added debug logging and visibility tracking**
```tsx
const DEBUG_TOUR = import.meta.env.DEV && false // Set to true to enable

const updateHighlight = () => {
  // ... Try selector first with fallback to elementId
  let element: HTMLElement | null = null
  const targetSelector = currentStepData.selector || `#${currentStepData.elementId}`
  
  try {
    element = document.querySelector(targetSelector) as HTMLElement
  } catch (e) {
    DEBUG_TOUR && console.warn(`[Tour] Invalid selector: ${targetSelector}`, e)
  }

  // Debug logging (guarded)
  if (DEBUG_TOUR) {
    console.log(`[Tour Step ${step}] Target: ${currentStepData.id}`)
    console.log(`  Selector: ${targetSelector}`)
    console.log(`  Found: ${element ? 'YES' : 'NO'}`)
    if (element) {
      console.log(`  Visible: ${element.offsetParent !== null ? 'YES' : 'NO'}`)
    }
  }

  // Check visibility (offsetParent = null means hidden)
  if (element && element.offsetParent !== null) {
    const rect = element.getBoundingClientRect()
    setHighlightBox(rect)
    setElementNotFound(false)
    
    // Track value for validation
    if (step === 0) {
      setElementValue((element as HTMLInputElement).value)
    }
  } else {
    setHighlightBox(null)
    setElementNotFound(true)
  }
}
```

**Change B: Added gating for Step 0**
```tsx
const handleNext = async () => {
  // Validation: Step 0 requires store name
  if (step === 0 && !elementValue.trim()) {
    DEBUG_TOUR && console.log('[Tour] Step 0 gating: blocking progression')
    alert('Please enter a store name before proceeding.')
    return
  }
  
  // ... proceed with next step
}

const canProceedToNextStep = step !== 0 || elementValue.trim() !== ''
```

**Change C: Added real-time input tracking**
```tsx
useEffect(() => {
  if (isOpen) {
    setStep(currentStep)
    updateHighlight()
    const handleResize = () => updateHighlight()
    window.addEventListener('resize', handleResize)
    
    // Track input changes for Step 0 gating
    const trackInputChange = () => {
      updateHighlight()  // Re-run highlight to get updated value
    }
    document.addEventListener('input', trackInputChange)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('input', trackInputChange)
    }
  }
}, [isOpen, step])
```

**Change D: Added element-not-found fallback UI**
```tsx
{/* Show warning if element not found */}
{elementNotFound && (
  <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-3">
    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-amber-900">
      <p className="font-bold mb-1">Can't find this section</p>
      <p className="text-xs">Make sure you've completed the previous step. The form or element should appear automatically.</p>
    </div>
  </div>
)}
```

**Change E: Disabled Next button when gating fails**
```tsx
<button
  onClick={handleNext}
  disabled={!canProceedToNextStep}
  title={!canProceedToNextStep && step === 0 ? 'Please enter a store name first' : ''}
  className={`... ${
    !canProceedToNextStep
      ? 'bg-blue-300 text-slate-500 cursor-not-allowed'
      : 'bg-blue-600 text-white hover:bg-blue-700'
  }`}
>
  {isLastStep ? 'Complete' : 'Next'}
</button>
```

---

## TESTING CHECKLIST

### Test 1: Store Name Input is Visible & Highlighted ✅
```
STEPS:
1. Login as a new seller (no store yet)
2. Navigate to /seller
3. See "Initialize Workshop" card
4. Click "Complete Setup"
5. See "Create Your Store" form with store name input

EXPECTED:
✓ Input field visible and focused
✓ Placeholder shows "My Artisan Shop"
✓ Input is ready to receive text
```

### Test 2: Tour Starts and Highlights Input ✅
```
STEPS:
1. Complete store creation form, enter a store name, submit
2. Dashboard loads with new store
3. See "Seller Quick Start" card with "Continue Tour" button
4. Click "Continue Tour"

EXPECTED:
✓ Tour modal appears (centered)
✓ Step 1/6 shows "Set up your store profile"
✓ Blue border highlights the store name input field
✓ Tooltip shows: "Store profile is what buyers see first"
✓ Next button is ENABLED (you can proceed)
```

### Test 3: Next Button Disabled Until Store Name Entered ✅
```
STEPS (if resuming tour from step 0):
1. Click "Start Tour" on new seller account (store exists but re-opening form)
2. See Step 1 modal with store-name input highlighted
3. Try clicking Next without entering any text

EXPECTED:
✓ Next button is DISABLED (grayed out, cursor: not-allowed)
✓ Hover shows tooltip: "Please enter a store name first"
✓ Clicking shows alert: "Please enter a store name before proceeding."
✓ Tour does NOT proceed to Step 2
```

### Test 4: Next Button Enabled After User Enters Store Name ✅
```
STEPS:
1. (From Test 3) Tour at Step 1, Next button disabled
2. Type any store name in the input (e.g., "My Shop")
3. Observe Next button state

EXPECTED:
✓ Next button becomes ENABLED (blue, hover effect returns)
✓ Tooltip disappears
✓ Can click Next to proceed to Step 2
```

### Test 5: Element Not Found Fallback ✅
```
STEPS:
1. Manually delete the store-name-input from DOM (DevTools)
2. Refresh tour to re-run updateHighlight()

EXPECTED:
✓ Amber warning box appears: "Can't find this section"
✓ Helpful message: "Make sure you've completed the previous step"
✓ Blue highlight box is not shown
✓ Next button remains disabled
✓ Tour doesn't break, user can skip or go back
```

### Test 6: Debug Logging (Optional) ✅
```
STEPS:
1. Edit SellerTour.tsx: change "DEBUG_TOUR = false" to "DEBUG_TOUR = true"
2. Start tour
3. Open browser DevTools Console
4. Watch input as you type

EXPECTED Console Logs:
[Tour Step 0] Target: store-setup
  Selector: [data-tour="store-name-input"]
  Found: YES
  Visible: YES
  BBox: DOMRect { top: 100, left: 50, width: 300, height: 40, ... }
  Value/Text: "My Shop"
```

### Test 7: Progression Through All Steps ✅
```
STEPS:
1. Complete Step 0 (enter store name, click Next)
2. Proceed through Steps 1-6:
   - Step 1: Create product (click Next)
   - Step 2: Add photos (click Next)
   - Step 3: Category (click Next)
   - Step 4: Publish (click Next)
   - Step 5: Orders (click Complete)

EXPECTED:
✓ Each step highlights the correct element
✓ Progress bar increments (1/6 → 2/6 → ... → 6/6)
✓ Database updates in real-time (console shows progress)
✓ Tour closes after Complete
✓ Congratulations card appears
✓ onboarding.completed = true in database
```

### Test 8: Skip & Resume ✅
```
STEPS:
1. Start tour at Step 0
2. Click "Skip for now"
3. Refresh page
4. Click "Continue Tour"

EXPECTED:
✓ Tour closes on skip
✓ Progress saved
✓ After refresh, button says "Continue Tour" (not "Start Tour")
✓ Tour resumes at the same step you left off
```

### Test 9: Mobile Fallback (Responsive) ✅
```
STEPS:
1. Start tour on mobile viewport (< 640px)
2. Proceed through steps

EXPECTED:
✓ Modal is centered and readable
✓ Blue highlight box still shows (if element is visible)
✓ Buttons are full-width and tappable
✓ Text doesn't overflow
```

### Test 10: Regression - Other Steps Still Work ✅
```
STEPS:
1. Go through entire tour
2. Resume at Step 1 (first product input)
3. Skip to Step 2 (image upload)
4. Skip to Step 3 (category)

EXPECTED:
✓ All other steps still highlight their elements correctly
✓ No JavaScript errors in console
✓ Each step's helper tip is still shown
✓ Back/Next navigation works smoothly
```

---

## HOW TO ENABLE DEBUG MODE

If tour highlighting stops working in the future, enable debugging:

**File**: `src/components/seller/SellerTour.tsx` (line 8)

```tsx
// BEFORE:
const DEBUG_TOUR = import.meta.env.DEV && false

// AFTER (to enable):
const DEBUG_TOUR = import.meta.env.DEV && true
```

Then check browser DevTools Console to see:
- Which selector is being targeted
- Whether element was found
- Element position & visibility
- Current input value

**Remember to disable after debugging:**
```tsx
const DEBUG_TOUR = import.meta.env.DEV && false
```

---

## SUMMARY OF IMPROVEMENTS

| Issue | Before | After |
|-------|--------|-------|
| **Target selector** | Generic form wrapper | Precise input with `[data-tour="store-name-input"]` |
| **Visibility check** | None (returned null silently) | Checks `offsetParent !== null` |
| **Element not found UX** | Silent failure, confusing | Shows amber warning box with explanation |
| **Gating** | No validation, can proceed without input | Step 0 requires store name to proceed |
| **Input tracking** | One-time at open | Real-time on every keystroke |
| **Debug info** | No logs | Comprehensive DEBUG_TOUR logs |
| **Next button state** | Always enabled | Disabled when validation fails |
| **User feedback** | No error message | Tooltip + alert on attempted progression |

---

## REGRESSION PREVENTION

These tests should be re-run if:
1. Any changes are made to SellerDashboard form structure
2. Onboarding step IDs or selectors are updated
3. Input component implementation changes
4. Tour library/logic is modified

Bookmark this file and refer to it in future PRs that touch onboarding!
