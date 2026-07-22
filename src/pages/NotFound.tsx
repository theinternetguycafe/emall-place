import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Home, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/Button'

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page Not Found | eMall Place Collective</title>
        <meta name="description" content="The page you are looking for could not be found." />
      </Helmet>

      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="max-w-xl w-full text-center">
          <div className="relative mb-10 inline-block">
            <span className="text-[10rem] font-black text-stone-100 leading-none select-none" aria-hidden="true">
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-xl">
                <Home className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">
            Eish, page not found.
          </h1>
          <p className="text-stone-500 font-medium text-lg mb-10 leading-relaxed">
            This page doesn't exist or may have moved. Let's get you back to the good stuff.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button className="rounded-full px-10 py-4 font-black text-base">
                Back to Home
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="outline" className="rounded-full px-10 py-4 font-black text-base group border-stone-200">
                Browse Marketplace <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
