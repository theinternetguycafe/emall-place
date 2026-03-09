import { Card } from '../components/ui/Card'
import { Users, Sparkles } from 'lucide-react'

export default function Community() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-4xl text-center">
      <div className="w-24 h-24 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-slate-200">
        <Users className="w-12 h-12" />
      </div>
      
      <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase mb-6">
        Community <span className="text-stone-400">Hub</span>
      </h1>
      
      <p className="text-xl text-stone-500 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
        We're building a space for buyers and sellers to connect, share stories, and grow the local township economy together.
      </p>

      <Card className="p-10 md:p-16 rounded-[3rem] border-stone-100 shadow-sm bg-gradient-to-br from-stone-50 to-white max-w-2xl mx-auto relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Sparkles className="w-32 h-32 text-slate-900" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Coming Soon</h2>
          <p className="text-stone-600 mb-8 font-medium">
            We are working hard behind the scenes to launch the Community Hub. Expect seller spotlights, business tips, community forums, and more.
          </p>
          <div className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-slate-900 text-white font-black uppercase tracking-widest text-xs">
            Stay Tuned
          </div>
        </div>
      </Card>
    </div>
  )
}
