/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          bg:         '#F9F8F6',
          surface:    '#FFFFFF',
          primary:    '#0F172A',
          gold:       '#C9A227',
          'gold-light': '#FBF3DC',
          green:      '#059669',
          'green-light': '#ECFDF5',
          red:        '#DC2626',
          'red-light': '#FEF2F2',
          orange:     '#D97706',
        },
      },
      borderRadius: {
        sm:   '8px',
        md:   '12px',
        lg:   '20px',
        xl:   '32px',
        pill: '9999px',
      },
      boxShadow: {
        sm:  '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
        md:  '0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)',
        lg:  '0 12px 32px rgba(0,0,0,.10), 0 4px 8px rgba(0,0,0,.04)',
        xl:  '0 24px 64px rgba(0,0,0,.12), 0 8px 16px rgba(0,0,0,.04)',
      },
      fontSize: {
        micro:      ['12px', { lineHeight: '1.4', fontWeight: '600' }],
        caption:    ['13px', { lineHeight: '1.4', fontWeight: '600' }],
        body:       ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        subheading: ['20px', { lineHeight: '1.3', fontWeight: '700' }],
        heading:    ['28px', { lineHeight: '1.2', fontWeight: '800' }],
        title:      ['40px', { lineHeight: '1.1', fontWeight: '800' }],
        display:    ['64px', { lineHeight: '0.95', fontWeight: '900' }],
      },
    },
  },
  plugins: [],
}
