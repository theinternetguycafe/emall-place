import React from 'react'

interface SellerTourProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  currentStep?: number
}

/**
 * Legacy component - replaced by SpotlightTour
 * This is kept as a stub to avoid breaking imports
 */
export default function SellerTour({ isOpen, onClose, onComplete }: SellerTourProps) {
  // If isOpen, immediately close and complete
  React.useEffect(() => {
    if (isOpen) {
      onComplete()
    }
  }, [isOpen, onComplete])

  return null
}
