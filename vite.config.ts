import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // For GitHub Pages deployment, set base to your repository name
  // Example: base: '/emall-place/'
  // For local development, keep it as '/'
  base: process.env.NODE_ENV === 'production' ? '/emall-place/' : '/',
})
