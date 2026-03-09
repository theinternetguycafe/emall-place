/**
 * Onboarding Modal
 * 
 * Dismissible celebration/welcome modal for key onboarding moments.
 * Features: focus trap, Escape key support, backdrop click handling.
 * Fade-in animation on mount.
 */

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/Button'

interface OnboardingModalProps {
  isOpen: boolean
  title: string
  body: string
  ctaLabel: string
  onClose: () => void
}

export function OnboardingModal({
  isOpen,
  title,
  body,
  ctaLabel,
  onClose
}: OnboardingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap: keep focus within modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap
      if (e.key !== 'Tab') return

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Auto-focus close button on mount
    closeButtonRef.current?.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Modal Container */}
      <div
        ref={modalRef}
        className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full mx-4 p-10 animate-fadeIn"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-stone-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-stone-50"
          aria-label="Close modal"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Celebration Icon/Emoji */}
        <div className="text-5xl text-center mb-6">✨</div>

        {/* Title */}
        <h2 id="modal-title" className="text-2xl font-black text-slate-900 uppercase tracking-tight text-center mb-4">
          {title}
        </h2>

        {/* Body */}
        <p className="text-center text-stone-600 font-medium leading-relaxed mb-8">
          {body}
        </p>

        {/* CTA Button */}
        <Button
          onClick={onClose}
          className="w-full rounded-xl py-4 font-black uppercase tracking-wider shadow-lg shadow-slate-200"
        >
          {ctaLabel}
        </Button>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
