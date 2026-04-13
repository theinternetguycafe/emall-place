import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, Package, Heart, ShieldCheck, Zap, Radio, ArrowRight, CheckCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (diffDays === 0) return `Today at ${timeStr}`
  if (diffDays === 1) return `Yesterday at ${timeStr}`
  if (diffDays < 7) return `${date.toLocaleDateString([], { weekday: 'short' })} at ${timeStr}`
  return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${timeStr}`
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  kyc:       { icon: <ShieldCheck className="w-4 h-4" />, color: 'text-blue-600',    bg: 'bg-blue-100' },
  like:      { icon: <Heart className="w-4 h-4" />,       color: 'text-rose-600',    bg: 'bg-rose-100' },
  order:     { icon: <Package className="w-4 h-4" />,     color: 'text-emerald-600', bg: 'bg-emerald-100' },
  booking:   { icon: <Zap className="w-4 h-4" />,         color: 'text-violet-600',  bg: 'bg-violet-100' },
  broadcast: { icon: <Radio className="w-4 h-4" />,       color: 'text-amber-600',   bg: 'bg-amber-100' },
  info:      { icon: <Bell className="w-4 h-4" />,        color: 'text-slate-600',   bg: 'bg-slate-100' },
}

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META['info']
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // ── Load & Subscribe ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return

    const load = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read).length)
      }
    }
    load()

    const channel = supabase
      .channel(`notifications:user_id=eq.${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as any, ...prev].slice(0, 30))
          setUnreadCount(prev => prev + 1)
          try { new Audio('/ping.mp3').play().catch(() => {}) } catch {}
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // ── Actions ───────────────────────────────────────────────────────────────
  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
  }

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    await supabase.from('notifications').update({ read: true })
      .eq('user_id', user!.id).eq('read', false)
  }

  const handleNotificationClick = async (n: any) => {
    if (!n.read) await markAsRead(n.id)
    if (n.link && n.link !== '#') {
      setIsOpen(false)
      navigate(n.link)
    }
  }

  if (!user) return null

  return (
    <div className="relative">
      {/* ── Bell Button ── */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(o => !o)}
        className={`relative p-2 md:p-3 text-slate-400 hover:text-slate-900 transition-all group rounded-full ${
          isOpen ? 'bg-stone-100' : 'hover:bg-stone-50'
        }`}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 md:h-6 md:w-6 group-hover:-translate-y-0.5 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {isOpen && (
        <div
          ref={panelRef}
          className={[
            'fixed inset-0 z-40 flex items-start justify-center pt-24 md:pt-32',
            'animate-in fade-in duration-200',
          ].join(' ')}
          onClick={() => setIsOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          
          {/* Modal - Centered */}
          <div
            className={[
              'relative w-[min(384px,calc(100vw-2rem))]',
              'bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden',
              'animate-in fade-in slide-in-from-top-4 duration-200',
            ].join(' ')}
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header - Premium Style */}
          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-stone-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Updates</h3>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded-full ml-2">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List - Improved Spacing */}
          <div className="max-h-[32rem] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
            {notifications.length === 0 ? (
              <div className="py-20 px-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                  <BellOff className="w-6 h-6 text-stone-300" />
                </div>
                <p className="text-sm font-bold text-slate-900">All caught up!</p>
                <p className="text-xs text-stone-500 mt-1.5 font-medium">Check back later for updates</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {notifications.map(n => {
                  const meta = getTypeMeta(n.type)
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-5 py-3.5 transition-all group/item border-l-4 ${
                        !n.read
                          ? 'bg-blue-50/60 border-l-blue-500 hover:bg-blue-50'
                          : 'bg-white border-l-transparent hover:bg-stone-50/50'
                      }`}
                    >
                      <div className="flex gap-3 items-start">
                        {/* Type icon - Compact */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${meta.bg} ${meta.color} flex items-center justify-center flex-none`}>
                          {meta.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Title row */}
                          <div className="flex items-start justify-between gap-3">
                            <p className={`text-sm leading-tight ${!n.read ? 'font-black text-slate-900' : 'font-bold text-stone-700'}`}>
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                            )}
                          </div>

                          {/* Message - Better contrast */}
                          {n.message && (
                            <p className="text-xs text-stone-600 font-medium mt-1 leading-relaxed line-clamp-2">
                              {n.message}
                            </p>
                          )}

                          {/* Footer row: time + action */}
                          <div className="flex items-center justify-between mt-2.5 gap-2">
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider flex-1">
                              {formatTime(n.created_at)}
                            </span>
                            {n.link && n.link !== '#' && (
                              <span className={`flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-1 rounded transition-colors flex-shrink-0 ${
                                !n.read ? 'text-blue-600 bg-blue-100/50' : 'text-stone-500 group-hover/item:text-slate-900 group-hover/item:bg-stone-100/50'
                              }`}>
                                View <ArrowRight className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer - Clean */}
          {notifications.length > 0 && (
            <div className="px-6 py-2.5 border-t border-stone-200 bg-stone-50/50">
              <p className="text-[9px] font-bold text-stone-400 text-center uppercase tracking-widest">
                {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'} total
              </p>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  )
}
