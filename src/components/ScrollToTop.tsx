import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop Component
 * Scrolls to the top of the page whenever the route changes
 * Also ensures page starts at top on browser reload
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Also scroll to top on component mount (browser reload)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return null
}
