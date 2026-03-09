import React from 'react'
import { AlertCircle, X } from 'lucide-react'

interface ErrorAlertProps {
  message: string
  onClose?: () => void
  className?: string
}

export default function ErrorAlert({ message, onClose, className = "" }: ErrorAlertProps) {
  if (!message) return null

  return (
    <div className={`bg-rose-50/50 border border-rose-100 p-6 my-6 rounded-[2rem] flex justify-between items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300 ${className}`}>
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
          <AlertCircle className="h-5 w-5 text-rose-600" aria-hidden="true" />
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-rose-900 mb-1">Attention Required</h4>
          <p className="text-sm text-rose-700/80 font-medium leading-relaxed">{message}</p>
        </div>
      </div>
      {onClose && (
        <button 
          onClick={onClose} 
          className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-100/50 rounded-xl transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
