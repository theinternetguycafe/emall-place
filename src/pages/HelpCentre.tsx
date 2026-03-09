import { Card } from '../components/ui/Card'
import { HelpCircle, Mail, MessageSquare } from 'lucide-react'

export default function HelpCentre() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase mb-4">
          Help <span className="text-stone-400">Centre</span>
        </h1>
        <p className="text-stone-500 font-medium">How can we help you today?</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <Card className="p-8 rounded-[2rem] border-stone-100 shadow-sm text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Email Support</h2>
          <p className="text-stone-500 text-sm mb-6">Send us an email and we'll get back to you within 24 hours.</p>
          <a href="mailto:support@emallplace.com" className="text-sm font-black uppercase tracking-widest text-blue-600 hover:text-blue-700">
            support@emallplace.com
          </a>
        </Card>

        <Card className="p-8 rounded-[2rem] border-stone-100 shadow-sm text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">WhatsApp Support</h2>
          <p className="text-stone-500 text-sm mb-6">Chat with our friendly support team directly on WhatsApp.</p>
          <a href="#" className="text-sm font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700">
            Start Chat
          </a>
        </Card>
      </div>

      <Card className="p-8 md:p-12 rounded-[2.5rem] border-stone-100 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <HelpCircle className="w-8 h-8 text-stone-400" />
          <h2 className="text-2xl font-black uppercase tracking-tight">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-lg mb-2">How do I track my order?</h3>
            <p className="text-stone-500">You can track your order by going to your Account Dashboard and selecting the Orders tab. You will also receive email updates as your order progresses.</p>
          </div>
          <hr className="border-stone-100" />
          <div>
            <h3 className="font-bold text-lg mb-2">How do I open a store?</h3>
            <p className="text-stone-500">Opening a store is easy! Click on "Become a Seller" at the bottom of the page or "Become a Partner" on the homepage, register your account, and follow the setup wizard.</p>
          </div>
          <hr className="border-stone-100" />
          <div>
            <h3 className="font-bold text-lg mb-2">What payment methods do you accept?</h3>
            <p className="text-stone-500">We accept secure payments via Yoco, which supports most major credit and debit cards securely.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
