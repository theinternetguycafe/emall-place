import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, HelpCircle } from 'lucide-react'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTour } from '../../contexts/TourContext'
import { SELLER_STEPS, OnboardingStep } from '../../lib/onboardingSteps'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export function SetupChecklist() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { startTour } = useTour()
  const { completedSteps, nextStep, isComplete } = useOnboarding()

  if (!profile || profile.role !== 'seller') {
    return null
  }

  const completedCount = SELLER_STEPS.filter(step => completedSteps.includes(step.id)).length
  const progressPercent = (completedCount / SELLER_STEPS.length) * 100

  const handlePrimaryAction = () => {
    if (!nextStep) {
      return
    }

    if (nextStep.id === 'tour_complete') {
      startTour()
      return
    }

    navigate(nextStep.actionPath)
  }

  return (
    <Card data-tour="setup-checklist" className="mb-8 rounded-[2rem] border-stone-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="border-stone-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-stone-500">
              Seller Progress
            </Badge>
            {!isComplete && nextStep && (
              <Badge className="bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                Current focus: {nextStep.title}
              </Badge>
            )}
          </div>

          <h2 className="text-2xl font-black tracking-tight text-slate-900">Launch checklist</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-stone-500">
            Keep these fundamentals tight so new buyers immediately understand your brand, your first listing, and how fulfillment works.
          </p>

          <div className="mt-5 flex items-center gap-4">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.24em] text-stone-400">
              {completedCount}/{SELLER_STEPS.length}
            </span>
          </div>
        </div>

        <Button onClick={startTour} variant="outline" size="sm" className="rounded-full gap-2 border-stone-200 px-5 self-start">
          <HelpCircle className="h-4 w-4" />
          Replay Spotlight
        </Button>
      </div>

      <div className="mt-6 grid gap-3">
        {SELLER_STEPS.map(step => (
          <StepRow
            key={step.id}
            step={step}
            isCompleted={completedSteps.includes(step.id)}
            isCurrent={nextStep?.id === step.id}
          />
        ))}
      </div>

      {nextStep && !isComplete && (
        <div className="mt-6 flex flex-col gap-4 rounded-[1.5rem] bg-slate-900 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-300">Next best move</p>
            <h3 className="mt-1 text-lg font-black">{nextStep.title}</h3>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-300">{nextStep.description}</p>
          </div>

          <Button onClick={handlePrimaryAction} size="sm" className="rounded-full bg-white px-5 text-slate-900 hover:bg-stone-100 gap-2 shadow-none">
            {nextStep.actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isComplete && (
        <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-center">
          <p className="text-lg font-black text-emerald-900">Store setup complete — you are ready to sell.</p>
        </div>
      )}
    </Card>
  )
}

interface StepRowProps {
  step: OnboardingStep
  isCompleted: boolean
  isCurrent: boolean
}

function StepRow({ step, isCompleted, isCurrent }: StepRowProps) {
  const statusLabel = isCompleted ? 'Done' : isCurrent ? 'Now' : 'Queued'
  const statusClasses = isCompleted
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : isCurrent
    ? 'bg-slate-900 text-white border-slate-900'
    : 'bg-stone-50 text-stone-500 border-stone-200'

  return (
    <div
      data-tour={`checklist-step-${step.id}`}
      className={`rounded-[1.5rem] border px-5 py-4 transition-all ${
        isCurrent ? 'border-slate-200 bg-slate-50 shadow-sm' : 'border-stone-100 bg-white'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border ${
              isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : isCurrent ? 'border-slate-900 bg-white text-slate-900' : 'border-stone-200 bg-stone-50 text-stone-400'
            }`}
          >
            {isCompleted ? <Check className="h-5 w-5" /> : <span className="text-sm font-black">{step.id === 'store_created' ? '1' : step.id === 'first_product' ? '2' : '3'}</span>}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-sm font-black uppercase tracking-[0.18em] ${isCompleted ? 'text-stone-400' : 'text-slate-900'}`}>
                {step.title}
              </h3>
              {!step.mandatory && <Badge variant="outline" className="border-stone-200 text-[10px] text-stone-500">Optional</Badge>}
            </div>
            <p className={`mt-2 text-sm leading-relaxed ${isCompleted ? 'text-stone-400' : 'text-stone-500'}`}>
              {step.description}
            </p>
          </div>
        </div>

        <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${statusClasses}`}>
          {statusLabel}
        </div>
      </div>
    </div>
  )
}
