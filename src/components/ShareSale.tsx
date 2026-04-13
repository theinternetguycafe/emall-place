import React, { useState } from 'react'
import { Product } from '../types'
import {
  X,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Copy,
  CheckCircle,
} from 'lucide-react'
import { Button } from './ui/Button'
import { Card } from './ui/Card'

interface ShareSaleProps {
  product: Product & { seller_store?: { store_name: string } }
  isOpen: boolean
  onClose: () => void
}

export default function ShareSale({
  product,
  isOpen,
  onClose,
}: ShareSaleProps) {
  const [copied, setCopied] = useState(false)
  const [sharedPlatform, setSharedPlatform] = useState<string | null>(null)

  const baseUrl = window.location.origin
  const productUrl = `${baseUrl}/product/${product.id}`
  const productTitle = product.title
  const salePrice = product.sale_price || product.price
  const originalPrice = product.price
  const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100)

  const shareText = `Check out this amazing deal! "${productTitle}" is now on sale - Save ${discount}%! R${salePrice} (was R${originalPrice})`
  const shareTextShort = `Sale: "${productTitle}" - R${salePrice} (was R${originalPrice})`

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&quote=${encodeURIComponent(shareText)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextShort)}&url=${encodeURIComponent(productUrl)}&hashtags=sale,shopping,southafrica`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + productUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(`Check this sale: ${productTitle}`)}&body=${encodeURIComponent(shareText + '\n\n' + productUrl)}`,
  }

  const handleShare = (platform: string, url: string) => {
    setSharedPlatform(platform)
    setTimeout(() => setSharedPlatform(null), 2000)
    window.open(url, '_blank', 'width=600,height=400')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-stone-100 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-black text-slate-900">Share This Sale</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Product Preview */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
            <div className="flex gap-4 items-start">
              {product.product_images?.[0] && (
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100">
                  <img
                    src={product.product_images[0].url}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-2">
                  {product.title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-red-600">
                    R{Math.round(salePrice).toLocaleString('en-ZA')}
                  </span>
                  <span className="text-xs text-stone-500 line-through">
                    R{Math.round(originalPrice).toLocaleString('en-ZA')}
                  </span>
                  <span className="text-xs font-black bg-red-100 text-red-700 px-2 py-1 rounded">
                    {discount}% OFF
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-stone-400">
              Share on social
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleShare('facebook', shareLinks.facebook)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                  sharedPlatform === 'facebook'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-stone-200 text-slate-900 bg-white hover:border-blue-600 hover:text-blue-600'
                }`}
              >
                {sharedPlatform === 'facebook' ? (
                  <CheckCircle size={16} />
                ) : (
                  <Facebook size={16} />
                )}
                Facebook
              </button>

              <button
                onClick={() => handleShare('twitter', shareLinks.twitter)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                  sharedPlatform === 'twitter'
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'border-stone-200 text-slate-900 bg-white hover:border-sky-500 hover:text-sky-500'
                }`}
              >
                {sharedPlatform === 'twitter' ? (
                  <CheckCircle size={16} />
                ) : (
                  <Twitter size={16} />
                )}
                Twitter
              </button>

              <button
                onClick={() => handleShare('whatsapp', shareLinks.whatsapp)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                  sharedPlatform === 'whatsapp'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-stone-200 text-slate-900 bg-white hover:border-green-600 hover:text-green-600'
                }`}
              >
                {sharedPlatform === 'whatsapp' ? (
                  <CheckCircle size={16} />
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 9.798c0 2.429.742 4.8 2.148 6.852L2.971 23.538l7.423-2.148c2.012 1.08 4.263 1.655 6.552 1.655 5.477 0 9.996-4.467 10.129-9.993.061-2.6-.949-5.02-2.837-6.857-1.887-1.838-4.398-2.85-7.067-2.852" />
                  </svg>
                )}
                WhatsApp
              </button>

              <button
                onClick={() => handleShare('email', shareLinks.email)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                  sharedPlatform === 'email'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'border-stone-200 text-slate-900 bg-white hover:border-amber-600 hover:text-amber-600'
                }`}
              >
                {sharedPlatform === 'email' ? (
                  <CheckCircle size={16} />
                ) : (
                  <Mail size={16} />
                )}
                Email
              </button>

              <button
                onClick={() => handleShare('linkedin', shareLinks.linkedin)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                  sharedPlatform === 'linkedin'
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'border-stone-200 text-slate-900 bg-white hover:border-blue-700 hover:text-blue-700'
                }`}
              >
                {sharedPlatform === 'linkedin' ? (
                  <CheckCircle size={16} />
                ) : (
                  <Linkedin size={16} />
                )}
                LinkedIn
              </button>
            </div>
          </div>

          {/* Copy Link */}
          <div className="space-y-3 pt-4 border-t border-stone-100">
            <p className="text-xs font-black uppercase tracking-widest text-stone-400">
              Or copy link
            </p>
            <div className="flex gap-3">
              <div className="flex-1 bg-stone-50 rounded-xl px-4 py-3 border border-stone-200 flex items-center gap-3">
                <span className="text-xs text-stone-500 truncate flex-1">
                  {productUrl}
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                  copied
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-stone-200 text-slate-900 bg-white hover:bg-stone-50'
                }`}
              >
                {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
