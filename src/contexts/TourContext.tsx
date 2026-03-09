import React, { createContext, useContext, useState } from 'react'

interface TourContextType {
  isTourOpen: boolean
  tourType: 'seller' | 'checklist' | null
  startTour: () => void
  startChecklistTour: () => void
  endTour: () => void
}

const TourContext = createContext<TourContextType | undefined>(undefined)

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isTourOpen, setIsTourOpen] = useState(false)
  const [tourType, setTourType] = useState<'seller' | 'checklist' | null>(null)

  return (
    <TourContext.Provider 
      value={{
        isTourOpen,
        tourType,
        startTour: () => {
          setTourType('seller')
          setIsTourOpen(true)
        },
        startChecklistTour: () => {
          setTourType('checklist')
          setIsTourOpen(true)
        },
        endTour: () => {
          setIsTourOpen(false)
          setTourType(null)
        },
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error('useTour must be used within a TourProvider')
  }
  return context
}
