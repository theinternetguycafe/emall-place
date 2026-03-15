import React, { useEffect, useMemo, useRef, useState } from 'react'
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
    type: 'click' | 'inputFilled' | 'event'
    selector?: string
    eventName?: string
  }
  onEnter?: (helpers?: TourHelpers) => void
  optional?: boolean
  link?: string
  panelPlacement?: 'auto' | 'top' | 'bottom' | 'left' | 'right'
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

type ViewportState = {
  width: number
  height: number
  offsetTop: number
  offsetLeft: number
}

const STORAGE_KEY = 'sellerTourStep'
const MOBILE_BREAKPOINT = 640
const DESKTOP_HIGHLIGHT_PADDING = 16
const MOBILE_HIGHLIGHT_PADDING = 8
const DESKTOP_PANEL_GAP = 24
const MOBILE_PANEL_GAP = 12
const DESKTOP_PANEL_PADDING = 32
const MOBILE_PANEL_PADDING = 16
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function isMobileViewport(viewport: ViewportState) {
  return viewport.width < MOBILE_BREAKPOINT
}

function getHighlightPadding(viewport: ViewportState) {
  return isMobileViewport(viewport) ? MOBILE_HIGHLIGHT_PADDING : DESKTOP_HIGHLIGHT_PADDING
}

function getPanelGap(viewport: ViewportState) {
  return isMobileViewport(viewport) ? MOBILE_PANEL_GAP : DESKTOP_PANEL_GAP
}

function getPanelPadding(viewport: ViewportState) {
  return isMobileViewport(viewport) ? MOBILE_PANEL_PADDING : DESKTOP_PANEL_PADDING
}

function getViewportMetrics(): ViewportState {
  const visualViewport = window.visualViewport

  return {
    width: Math.round(visualViewport?.width ?? window.innerWidth),
    height: Math.round(visualViewport?.height ?? window.innerHeight),
    offsetTop: Math.round(visualViewport?.offsetTop ?? 0),
    offsetLeft: Math.round(visualViewport?.offsetLeft ?? 0),
  }
}

function getPanelPosition({
  rect,
  viewport,
  panelWidth,
  panelHeight,
  placement,
  panelGap,
  panelPadding,
}: {
  rect: SpotlightRect | null
  viewport: ViewportState
  panelWidth: number
  panelHeight: number
  placement: SpotlightStep['panelPlacement']
  panelGap: number
  panelPadding: number
}) {
  const minTop = viewport.offsetTop + panelPadding
  const maxTop = viewport.offsetTop + viewport.height - panelHeight - panelPadding
  const minLeft = viewport.offsetLeft + panelPadding
  const maxLeft = viewport.offsetLeft + viewport.width - panelWidth - panelPadding

  if (!rect) {
    return {
      top: minTop,
      left: minLeft,
    }
  }

  const placements = placement && placement !== 'auto'
    ? [placement, 'bottom', 'top', 'right', 'left']
    : ['bottom', 'top', 'right', 'left']

  for (const candidate of placements) {
    if (candidate === 'bottom') {
      const top = rect.top + rect.height + panelGap
      if (top + panelHeight <= viewport.offsetTop + viewport.height - panelPadding) {
        return {
          top,
          left: clamp(rect.left + rect.width / 2 - panelWidth / 2, minLeft, maxLeft),
        }
      }
    }

    if (candidate === 'top') {
      const top = rect.top - panelHeight - panelGap
      if (top >= minTop) {
        return {
          top,
          left: clamp(rect.left + rect.width / 2 - panelWidth / 2, minLeft, maxLeft),
        }
      }
    }

    if (candidate === 'right') {
      const left = rect.left + rect.width + panelGap
      if (left + panelWidth <= viewport.offsetLeft + viewport.width - panelPadding) {
        return {
          top: clamp(rect.top + rect.height / 2 - panelHeight / 2, minTop, maxTop),
          left,
        }
      }
    }

    if (candidate === 'left') {
      const left = rect.left - panelWidth - panelGap
      if (left >= minLeft) {
        return {
          top: clamp(rect.top + rect.height / 2 - panelHeight / 2, minTop, maxTop),
          left,
        }
      }
    }
  }

  return {
    top: clamp(rect.top + rect.height + panelGap, minTop, maxTop),
    left: clamp(rect.left + rect.width / 2 - panelWidth / 2, minLeft, maxLeft),
  }
}

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

function getSpotlightRect(target: HTMLElement, viewport: ViewportState): SpotlightRect {
  const bounds = target.getBoundingClientRect()
  const highlightPadding = getHighlightPadding(viewport)
  const panelPadding = getPanelPadding(viewport)
  const minTop = viewport.offsetTop + panelPadding
  const maxTop = viewport.offsetTop + viewport.height - panelPadding
  const minLeft = viewport.offsetLeft + panelPadding
  const maxLeft = viewport.offsetLeft + viewport.width - panelPadding
  const top = clamp(bounds.top + viewport.offsetTop - highlightPadding, minTop, Math.max(minTop, maxTop))
  const left = clamp(bounds.left + viewport.offsetLeft - highlightPadding, minLeft, Math.max(minLeft, maxLeft))
  const right = clamp(bounds.right + viewport.offsetLeft + highlightPadding, left + 1, Math.max(left + 1, maxLeft))
  const bottom = clamp(bounds.bottom + viewport.offsetTop + highlightPadding, top + 1, Math.max(top + 1, maxTop))

  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
  }
}

async function revealTarget(target: HTMLElement, viewport: ViewportState) {
  if (isMobileViewport(viewport)) {
    const bounds = target.getBoundingClientRect()
    const desiredCenter = viewport.height * 0.32
    const delta = bounds.top + bounds.height / 2 - desiredCenter

    if (Math.abs(delta) > 12) {
      window.scrollBy({ top: delta, behavior: 'smooth' })
      await wait(280)
      return
    }
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  await wait(250)
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
  const [viewport, setViewport] = useState<ViewportState>(() => getViewportMetrics())
  const [panelHeight, setPanelHeight] = useState(320)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const currentStep = steps[currentStepIndex]

  const stepProgress = useMemo(() => {
    if (!steps.length) {
      return 0
    }

    return ((currentStepIndex + 1) / steps.length) * 100
  }, [currentStepIndex, steps.length])

  useEffect(() => {
    if (!isOpen || !panelRef.current) {
      return
    }

    const updatePanelHeight = () => {
      if (!panelRef.current) {
        return
      }

      setPanelHeight(panelRef.current.getBoundingClientRect().height)
    }

    updatePanelHeight()

    const observer = new ResizeObserver(() => updatePanelHeight())
    observer.observe(panelRef.current)

    return () => observer.disconnect()
  }, [currentStep, isAdvancing, isOpen, notFound, viewport.height, viewport.width])

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
      await revealTarget(target, viewport)
      setRect(getSpotlightRect(target, viewport))
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
    if (!isOpen || !currentStep || isAdvancing) {
      return
    }

    let cancelled = false

    const prepare = async () => {
      const target = await ensureStepReady(currentStep)
      if (cancelled || !target) {
        return
      }

      setRect(getSpotlightRect(target, viewport))
    }

    void prepare()

    return () => {
      cancelled = true
    }
  }, [currentStep, helpers, isAdvancing, isOpen, location.hash, location.pathname, location.search, navigate, viewport.height, viewport.width])

  useEffect(() => {
    if (!isOpen || !currentStep || notFound) {
      return
    }

    const syncPosition = (nextViewport = viewport) => {
      const target = getTarget(currentStep.selector)
      if (target) {
        setRect(getSpotlightRect(target, nextViewport))
      }
    }

    const handleViewport = () => {
      const nextViewport = getViewportMetrics()
      setViewport(nextViewport)
      syncPosition(nextViewport)
    }

    const handleScroll = () => syncPosition()
    const visualViewport = window.visualViewport

    window.addEventListener('resize', handleViewport)
    window.addEventListener('scroll', handleScroll, true)
    visualViewport?.addEventListener('resize', handleViewport)
    visualViewport?.addEventListener('scroll', handleViewport)

    return () => {
      window.removeEventListener('resize', handleViewport)
      window.removeEventListener('scroll', handleScroll, true)
      visualViewport?.removeEventListener('resize', handleViewport)
      visualViewport?.removeEventListener('scroll', handleViewport)
    }
  }, [currentStep, isOpen, notFound, viewport])

  useEffect(() => {
    if (!isOpen || !currentStep || notFound || isAdvancing || !currentStep.advanceOn) {
      return
    }

    if (currentStep.advanceOn.type === 'event' && currentStep.advanceOn.eventName) {
      const eventName = currentStep.advanceOn.eventName
      const handleEvent = () => {
        window.removeEventListener(eventName, handleEvent)
        void goNext()
      }

      window.addEventListener(eventName, handleEvent)
      return () => window.removeEventListener(eventName, handleEvent)
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

  const isMobile = isMobileViewport(viewport)
  const panelPadding = getPanelPadding(viewport)
  const panelGap = getPanelGap(viewport)
  const panelWidth = isMobile ? viewport.width - panelPadding * 2 : Math.min(380, viewport.width - panelPadding * 2)
  const panelMaxHeight = Math.max(isMobile ? 240 : 260, viewport.height - panelPadding * 2)
  const resolvedPanelHeight = Math.min(panelHeight, panelMaxHeight)
  const mobilePanelHeight = Math.min(Math.max(280, Math.round(viewport.height * 0.42)), panelMaxHeight)
  const top = rect?.top ?? viewport.offsetTop + panelPadding
  const left = rect?.left ?? viewport.offsetLeft + panelPadding
  const width = rect?.width ?? viewport.width - panelPadding * 2
  const height = rect?.height ?? viewport.height - panelPadding * 2
  const floatingPanelPosition = getPanelPosition({
    rect,
    viewport,
    panelWidth,
    panelHeight: resolvedPanelHeight,
    placement: currentStep.panelPlacement,
    panelGap,
    panelPadding,
  })
  const panelTop = isMobile
    ? viewport.offsetTop + viewport.height - mobilePanelHeight - panelPadding
    : floatingPanelPosition.top
  const panelLeft = isMobile ? viewport.offsetLeft + panelPadding : floatingPanelPosition.left
  const safeMaxHeight = isMobile
    ? mobilePanelHeight
    : Math.min(panelMaxHeight, viewport.offsetTop + viewport.height - panelTop - panelPadding)
  const overlayClassName = isMobile ? 'fixed bg-slate-950/58' : 'fixed bg-slate-950/70 backdrop-blur-[2px]'
  const spotlightClassName = isMobile
    ? 'fixed rounded-[1.25rem] border border-white/70 bg-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.22),0_18px_48px_rgba(15,23,42,0.24)] transition-all duration-300'
    : 'fixed rounded-[2rem] border border-white/80 bg-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_24px_80px_rgba(15,23,42,0.35)] transition-all duration-300'
  const panelShellClassName = isMobile
    ? 'fixed rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.98))] shadow-[0_-18px_50px_rgba(15,23,42,0.18)] flex flex-col'
    : 'fixed rounded-[2rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_24px_80px_rgba(15,23,42,0.28)] flex flex-col'

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
          <div className={overlayClassName} style={{ top: viewport.offsetTop, left: viewport.offsetLeft, width: viewport.width, height: Math.max(0, top - viewport.offsetTop), pointerEvents: 'auto', zIndex: 9999 }} />
          <div className={overlayClassName} style={{ top, left: viewport.offsetLeft, width: Math.max(0, left - viewport.offsetLeft), height, pointerEvents: 'auto', zIndex: 9999 }} />
          <div className={overlayClassName} style={{ top, left: left + width, width: Math.max(0, viewport.offsetLeft + viewport.width - (left + width)), height, pointerEvents: 'auto', zIndex: 9999 }} />
          <div className={overlayClassName} style={{ top: top + height, left: viewport.offsetLeft, width: viewport.width, height: Math.max(0, viewport.offsetTop + viewport.height - (top + height)), pointerEvents: 'auto', zIndex: 9999 }} />
          <div
            className={spotlightClassName}
            style={{ top, left, width, height, zIndex: 10000, pointerEvents: 'none' }}
          >
            <div className={`absolute inset-0 ${isMobile ? 'rounded-[1.25rem] border-2' : 'rounded-[2rem] border-4'} border-white/15`} />
            <div className={`absolute inset-0 ${isMobile ? 'rounded-[1.25rem]' : 'rounded-[2rem]'} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]`} />
          </div>
        </>
      )}

      {!rect && !notFound && <div className={`${overlayClassName} inset-0`} style={{ zIndex: 9998, pointerEvents: 'auto' }} />}
      {notFound && <div className={`${overlayClassName} inset-0`} style={{ zIndex: 9998, pointerEvents: 'auto' }} />}

      <div
        ref={panelRef}
        className={panelShellClassName}
        style={{ top: panelTop, left: panelLeft, width: panelWidth, maxHeight: safeMaxHeight, zIndex: 10001, pointerEvents: 'auto' }}
      >
        <div className={isMobile ? 'rounded-[2rem] border border-white/80 bg-white/92 p-4 sm:p-5' : 'rounded-[2rem] border border-white/80 bg-white/80 p-5 backdrop-blur-xl sm:p-6'} style={{ maxHeight: safeMaxHeight, overflowY: 'auto', overscrollBehavior: 'contain', paddingBottom: isMobile ? 'calc(1rem + env(safe-area-inset-bottom, 0px))' : undefined }}>
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
