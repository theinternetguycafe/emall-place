import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop Component
 * Scrolls to the top of the page whenever the route changes
 * Also ensures page starts at top on browser reload
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  // Disable browser's automatic scroll restoration to ensure we always start at top
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // Immediate scroll
    window.scrollTo(0, 0);
    
    // Backup scroll in case of slow rendering or browser override
    const scrollRaf = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    
    return () => cancelAnimationFrame(scrollRaf);
  }, [pathname])

  return null
}
