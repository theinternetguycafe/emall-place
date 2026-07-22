import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

export default function Legal() {
  return (
    <>
      <Helmet>
        <title>Legal | eMall Place Collective</title>
      </Helmet>
      <div className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Legal</h1>
        <p className="text-stone-500 font-medium mb-12">eMall Place Collective legal information and policies.</p>
        <div className="space-y-4">
          <Link to="/privacy-policy" className="flex items-center justify-between p-6 rounded-2xl border border-stone-200 hover:border-slate-900 hover:shadow-md transition-all group">
            <span className="font-black text-slate-900">Privacy Policy</span>
            <span className="text-stone-400 group-hover:text-slate-900 transition-colors">→</span>
          </Link>
          <Link to="/terms-of-service" className="flex items-center justify-between p-6 rounded-2xl border border-stone-200 hover:border-slate-900 hover:shadow-md transition-all group">
            <span className="font-black text-slate-900">Terms of Service</span>
            <span className="text-stone-400 group-hover:text-slate-900 transition-colors">→</span>
          </Link>
          <Link to="/shipping-policy" className="flex items-center justify-between p-6 rounded-2xl border border-stone-200 hover:border-slate-900 hover:shadow-md transition-all group">
            <span className="font-black text-slate-900">Shipping &amp; Delivery Policy</span>
            <span className="text-stone-400 group-hover:text-slate-900 transition-colors">→</span>
          </Link>
          <Link to="/returns-policy" className="flex items-center justify-between p-6 rounded-2xl border border-stone-200 hover:border-slate-900 hover:shadow-md transition-all group">
            <span className="font-black text-slate-900">Returns Policy</span>
            <span className="text-stone-400 group-hover:text-slate-900 transition-colors">→</span>
          </Link>
        </div>
      </div>
    </>
  )
}
