import React, { useState } from 'react'
import { Share2, Copy, MessageCircle, Facebook, Twitter, Check } from 'lucide-react'
import { Button } from '../ui/Button'

interface StoreShareProps {
  storeName: string
}

export function StoreShare({ storeName }: StoreShareProps) {
  const [copied, setCopied] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const storeUrl = window.location.href

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${storeName} on eMall Place`,
          text: `Check out ${storeName} on eMall Place!`,
          url: storeUrl,
        })
      } catch (err) {
        console.log('User cancelled native share or it failed.')
      }
    } else {
      setIsOpen(!isOpen)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(storeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="sm" 
        className="rounded-full shadow-sm hover:bg-stone-50 border-stone-200 text-stone-700 bg-white group transition-all"
        onClick={handleNativeShare}
      >
        <Share2 className="w-4 h-4 mr-2 group-hover:text-emerald-500 transition-colors" />
        <span className="font-bold text-xs">Share Store</span>
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 sm:left-0 sm:right-auto md:left-auto md:right-0 mt-2 w-56 bg-white border border-stone-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Share via</span>
            </div>
            
            <a 
              href={`https://wa.me/?text=${encodeURIComponent(`Check out ${storeName} on eMall Place! ${storeUrl}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors text-sm font-bold text-slate-700 w-full text-left"
              onClick={() => setIsOpen(false)}
            >
              <MessageCircle className="w-5 h-5 text-emerald-500" /> WhatsApp
            </a>
            
            <a 
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-sm font-bold text-slate-700 w-full text-left"
              onClick={() => setIsOpen(false)}
            >
              <Facebook className="w-5 h-5 text-blue-600" /> Facebook
            </a>
            
            <a 
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${storeName} on eMall Place!`)}&url=${encodeURIComponent(storeUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-sky-50 transition-colors text-sm font-bold text-slate-700 w-full text-left"
              onClick={() => setIsOpen(false)}
            >
              <Twitter className="w-5 h-5 text-sky-500" /> Twitter / X
            </a>
            
            <button 
              onClick={handleCopy}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-sm font-bold text-slate-700 w-full text-left border-t border-stone-100"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-stone-400" />}
              {copied ? 'Copied Link!' : 'Copy storefront Link'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
