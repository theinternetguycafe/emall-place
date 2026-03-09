import React from 'react'
import { CheckCircle, X } from 'lucide-react'

interface SuccessAlertProps {
  message: string
  onClose?: () => void
  className?: string
}

export default function SuccessAlert({ message, onClose, className = "" }: SuccessAlertProps) {
  if (!message) return null

  return (
    <div className={`bg-emerald-50/50 border border-emerald-100 p-6 my-6 rounded-[2rem] flex justify-between items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300 ${className}`}>
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-emerald-600" aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-emerald-900 mb-1">Success</h4>
          <p className="text-sm text-emerald-700/80 font-medium leading-relaxed">{message}</p>
        </div>
      </div>
      {onClose && (
        <button 
          onClick={onClose} 
          className="p-2 text-emerald-300 hover:text-emerald-600 hover:bg-emerald-100/50 rounded-xl transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
