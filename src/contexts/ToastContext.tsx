import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 11)
    const toast: Toast = { id, message, type, duration }

    setToasts(prev => [...prev, toast])

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

// Toast helper functions
export const toast = {
  success: (msg: string) => msg,
  error: (msg: string) => msg,
  info: (msg: string) => msg,
}

// ToastContainer component
function ToastContainer({ 
  toasts, 
  removeToast 
}: { 
  toasts: Toast[]
  removeToast: (id: string) => void 
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm space-y-3">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  )
}

// Individual toast item
function ToastItem({ 
  toast: t, 
  onRemove 
}: { 
  toast: Toast
  onRemove: (id: string) => void 
}) {
  const iconConfig = {
    success: { icon: CheckCircle, colors: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
    error: { icon: AlertCircle, colors: 'bg-rose-50 border-rose-100 text-rose-600' },
    info: { icon: Info, colors: 'bg-blue-50 border-blue-100 text-blue-600' },
  }

  const config = iconConfig[t.type]
  const Icon = config.icon

  return (
    <div 
      className={`${config.colors} border rounded-xl p-4 shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm font-medium flex-grow text-slate-900">{t.message}</p>
      <button
        onClick={() => onRemove(t.id)}
        className="text-slate-400 hover:text-slate-600 flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
