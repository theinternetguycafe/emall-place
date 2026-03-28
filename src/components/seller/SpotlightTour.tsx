import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react'
import { Button } from '../ui/Button'

type TourHelpers = {
  openStoreEdit?: () => void
}

export interface SpotlightStep {
  id: string
  title: string
  body: string
  selector: string
  advanceOn?: {
    type: 'click' | 'inputFilled'
    selector?: string
  }
  onEnter?: (helpers?: TourHelpers) => void
  optional?: boolean
  link?: string
}

interface SpotlightTourProps {
  steps: SpotlightStep[]
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  helpers?: TourHelpers
  initialStepIndex?: number
}

type SpotlightRect = {
  top: number
  left: number
  width: number
  height: number
}

const STORAGE_KEY = 'sellerTourStep'
const HIGHLIGHT_PADDING = 10
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function getTarget(selector: string) {
  const target = document.querySelector(selector) as HTMLElement | null
  if (!target) {
    return null
  }

  const style = window.getComputedStyle(target)
  const isHidden = style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0'

  if (isHidden || target.offsetParent === null) {
    return null
  }

  return target
}

function getSpotlightRect(target: HTMLElement): SpotlightRect {
  const bounds = target.getBoundingClientRect()

  return {
    top: Math.max(12, bounds.top - HIGHLIGHT_PADDING),
    left: Math.max(12, bounds.left - HIGHLIGHT_PADDING),
    width: bounds.width + HIGHLIGHT_PADDING * 2,
    height: bounds.height + HIGHLIGHT_PADDING * 2,
  }
}

function isTypingElement(element: EventTarget | null) {
  if (!(element instanceof HTMLElement)) {
    return false
  }

  const tagName = element.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || element.isContentEditable
}

export default function SpotlightTour({
  steps,
  isOpen,
  onClose,
  onComplete,
  helpers,
  initialStepIndex = 0,
}: SpotlightTourProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? Number(saved) : initialStepIndex
  })
  const [rect, setRect] = useState<SpotlightRect | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })

  const currentStep = steps[currentStepIndex]

  const stepProgress = useMemo(() => {
    if (!steps.length) {
      return 0
    }

    return ((currentStepIndex + 1) / steps.length) * 100
  }, [currentStepIndex, steps.length])

  const waitForElement = (selector: string, timeoutMs = 12000) =>
    new Promise<HTMLElement | null>(resolve => {
      const existing = getTarget(selector)
      if (existing) {
        resolve(existing)
        return
      }

      const observer = new MutationObserver(() => {
        const candidate = getTarget(selector)
        if (candidate) {
          observer.disconnect()
          resolve(candidate)
        }
      })

      observer.observe(document.body, { childList: true, subtree: true, attributes: true })

      window.setTimeout(() => {
        observer.disconnect()
        resolve(getTarget(selector))
      }, timeoutMs)
    })

  const ensureStepReady = async (step: SpotlightStep) => {
    const currentPath = `${location.pathname}${location.search}${location.hash}`
    
    if (step.link && currentPath !== step.link) {
      navigate(step.link)
      await wait(550)
    }

    if (step.onEnter) {
      step.onEnter(helpers)
      await wait(180)
    }

    const target = await waitForElement(step.selector)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      await wait(250)
      setRect(getSpotlightRect(target))
      setNotFound(false)
      return target
    }

    setRect(null)
    setNotFound(true)
    return null
  }

  useEffect(() => {
    if (!isOpen) {
      localStorage.removeItem(STORAGE_KEY)
      setCurrentStepIndex(initialStepIndex)
      setRect(null)
      setNotFound(false)
      setPendingIndex(null)
      setIsAdvancing(false)
      return
    }

    localStorage.setItem(STORAGE_KEY, String(currentStepIndex))
  }, [currentStepIndex, initialStepIndex, isOpen])

  useEffect(() => {
    if (!isOpen || !currentStep) {
      return
    }

    let cancelled = false

    const prepare = async () => {
      const target = await ensureStepReady(currentStep)
      if (cancelled || !target) {
        return
      }

      setRect(getSpotlightRect(target))
    }

    void prepare()

    return () => {
      cancelled = true
    }
  }, [currentStep, helpers, isOpen, location.hash, location.pathname, location.search, navigate, rect])

  useEffect(() => {
    if (!isOpen || !currentStep || notFound) {
      return
    }

    const syncPosition = () => {
      const target = getTarget(currentStep.selector)
      if (target) {
        setRect(getSpotlightRect(target))
      }
    }

    const handleViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
      syncPosition()
    }

    window.addEventListener('resize', handleViewport)
    window.addEventListener('scroll', syncPosition, true)

    return () => {
      window.removeEventListener('resize', handleViewport)
      window.removeEventListener('scroll', syncPosition, true)
    }
  }, [currentStep, isOpen, notFound])

  useEffect(() => {
    if (!isOpen || !currentStep || notFound || isAdvancing || !currentStep.advanceOn) {
      return
    }

    const selector = currentStep.advanceOn.selector || currentStep.selector
    const target = getTarget(selector)

    if (!target) {
      return
    }

    if (currentStep.advanceOn.type === 'click') {
      const handleClick = () => {
        void goNext()
      }

      target.addEventListener('click', handleClick, { once: true })
      return () => target.removeEventListener('click', handleClick)
    }

    if (currentStep.advanceOn.type === 'inputFilled') {
      const input = target as HTMLInputElement | HTMLTextAreaElement

      const checkValue = () => {
        if (input.value.trim()) {
          input.removeEventListener('input', checkValue)
          void goNext()
        }
      }

      checkValue()
      input.addEventListener('input', checkValue)
      return () => input.removeEventListener('input', checkValue)
    }
  }, [currentStep, isOpen, isAdvancing, notFound, rect])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingElement(event.target)) {
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if ((event.key === 'ArrowRight' || event.key === 'Enter') && !isAdvancing) {
        event.preventDefault()
        void goNext()
      }

      if (event.key === 'ArrowLeft' && !isAdvancing) {
        event.preventDefault()
        handlePrevStep()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAdvancing, isOpen, onClose, currentStepIndex])

  const goNext = async () => {
    if (isAdvancing) {
      return
    }

    setIsAdvancing(true)
    setPendingIndex(null)
    setNotFound(false)
    setRect(null)

    let nextIndex = currentStepIndex + 1

    try {
      while (nextIndex < steps.length) {
        const nextStep = steps[nextIndex]
        const target = await ensureStepReady(nextStep)

        if (!target) {
          if (nextStep.optional) {
            nextIndex += 1
            continue
          }

          setPendingIndex(nextIndex)
          return
        }

        setPendingIndex(null)
        setCurrentStepIndex(nextIndex)
        return
      }

      onComplete()
    } finally {
      setIsAdvancing(false)
    }
  }

  const handlePrevStep = () => {
    if (currentStepIndex === 0 || isAdvancing) {
      return
    }

    setPendingIndex(null)
    setNotFound(false)
    setRect(null)
    setCurrentStepIndex(previous => previous - 1)
  }

  const handleTryAgain = async () => {
    if (isAdvancing) return
    
    setIsAdvancing(true)
    const targetIndex = pendingIndex ?? currentStepIndex
    const step = steps[targetIndex]

    if (!step) {
      setIsAdvancing(false)
      return
    }

    const target = await ensureStepReady(step)
    if (target) {
      setPendingIndex(null)
      setCurrentStepIndex(targetIndex)
    }
    setIsAdvancing(false)
  }

  const handleSkipStep = () => {
    if (isAdvancing) return
    
    const targetIndex = pendingIndex ?? currentStepIndex

    if (targetIndex >= steps.length - 1) {
      onComplete()
      return
    }

    setPendingIndex(null)
    setNotFound(false)
    setRect(null)
    setCurrentStepIndex(targetIndex + 1)
  }

  if (!isOpen || !currentStep) {
    return null
  }

  const panelWidth = Math.min(380, viewport.width - 24)
  const panelHeight = 272
  const gap = 18
  const top = rect?.top ?? 24
  const left = rect?.left ?? 12
  const width = rect?.width ?? viewport.width - 24
  const height = rect?.height ?? viewport.height - 48

  let panelTop = top + height + gap
  if (panelTop + panelHeight > viewport.height - 12) {
    panelTop = top - panelHeight - gap
  }
  panelTop = Math.max(12, Math.min(viewport.height - panelHeight - 12, panelTop))

  const panelLeft = Math.max(
    12,
    Math.min(viewport.width - panelWidth - 12, left + width / 2 - panelWidth / 2),
  )

  const autoHint =
    currentStep.advanceOn?.type === 'click'
      ? 'This step continues automatically after you interact with the highlighted control.'
      : currentStep.advanceOn?.type === 'inputFilled'
      ? 'This step continues automatically once the highlighted field has content.'
      : null

  const renderMissingState = (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Spotlight needs attention</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">This section is not visible yet</h3>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-stone-600">
        The tour could not find the next target. Finish the current action, open the relevant page section, or skip ahead if you want to continue manually.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button size="sm" variant="outline" onClick={handleTryAgain} className="rounded-xl border-stone-200">
          Try Again
        </Button>
        <Button size="sm" variant="outline" onClick={handleSkipStep} className="rounded-xl border-stone-200">
          Skip Step
        </Button>
        <Button size="sm" onClick={onClose} className="rounded-xl">
          Exit Tour
        </Button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[999] pointer-events-none">
      {rect && !notFound && (
        <>
          <div className="fixed bg-slate-950/70 backdrop-blur-[2px]" style={{ top: 0, left: 0, width: viewport.width, height: top, pointerEvents: 'auto', zIndex: 9999 }} onClick={onClose} />
          <div className="fixed bg-slate-950/70 backdrop-blur-[2px]" style={{ top, left: 0, width: left, height, pointerEvents: 'auto', zIndex: 9999 }} onClick={onClose} />
          <div className="fixed bg-slate-950/70 backdrop-blur-[2px]" style={{ top, left: left + width, width: viewport.width - (left + width), height, pointerEvents: 'auto', zIndex: 9999 }} onClick={onClose} />
          <div className="fixed bg-slate-950/70 backdrop-blur-[2px]" style={{ top: top + height, left: 0, width: viewport.width, height: viewport.height - (top + height), pointerEvents: 'auto', zIndex: 9999 }} onClick={onClose} />
          <div
            className="fixed rounded-[2rem] border border-white/80 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_24px_80px_rgba(15,23,42,0.35)] transition-all duration-300"
            style={{ top, left, width, height, zIndex: 10000, pointerEvents: 'none' }}
          >
            <div className="absolute inset-0 rounded-[2rem] border-4 border-white/15" />
            <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]" />
          </div>
        </>
      )}

      {!rect && !notFound && <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]" style={{ zIndex: 9998 }} />}
      {notFound && <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px]" style={{ zIndex: 9998 }} />}

      <div
        className="fixed rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
        style={{ top: panelTop, left: panelLeft, width: panelWidth, zIndex: 10001, pointerEvents: 'auto' }}
      >
        <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 backdrop-blur-xl sm:p-6">
          {notFound ? (
            renderMissingState
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                    Guided Spotlight
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-900">
                      {currentStepIndex + 1}
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-stone-400">
                        Step {currentStepIndex + 1} of {steps.length}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        {steps.map((step, index) => (
                          <span
                            key={step.id}
                            className={`h-1.5 rounded-full transition-all duration-300 ${index === currentStepIndex ? 'w-7 bg-slate-900' : index < currentStepIndex ? 'w-4 bg-slate-400' : 'w-4 bg-stone-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-slate-900"
                  aria-label="Close tour"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-slate-900 transition-all duration-300" style={{ width: `${stepProgress}%` }} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight text-slate-900">{currentStep.title}</h3>
                <p className="text-sm leading-relaxed text-stone-600">{currentStep.body}</p>
              </div>

              {autoHint && (
                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs font-semibold leading-relaxed text-sky-900">
                  {autoHint}
                </div>
              )}

              {isAdvancing && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-900">
                  Moving the spotlight to the next workspace section. This can take a moment while your seller dashboard refreshes.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0 || isAdvancing}
                  className="rounded-xl border-stone-200 gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button size="sm" onClick={() => void goNext()} disabled={isAdvancing} className="rounded-xl gap-2">
                  {currentStepIndex === steps.length - 1 ? 'Finish Tour' : 'Next'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl py-2 text-center text-[11px] font-black uppercase tracking-[0.24em] text-stone-400 transition-colors hover:text-slate-900"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
