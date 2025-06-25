import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dotenv from 'dotenv'

// Force load .env file
const envResult = dotenv.config()
console.log('🔍 Dotenv result:', envResult.error ? 'ERROR' : 'SUCCESS')
if (envResult.parsed) {
  console.log('🔍 Parsed env variables:', Object.keys(envResult.parsed))
}

// Debug environment variables
console.log('🔍 VITE DEBUG - Environment variables:')
console.log('VITE_GOOGLE_MAPS_API_KEY:', process.env.VITE_GOOGLE_MAPS_API_KEY)
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('All VITE_ variables:', 
  Object.keys(process.env)
    .filter(key => key.startsWith('VITE_'))
    .reduce((obj, key) => ({ ...obj, [key]: process.env[key] }), {})
)

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    // FORCE the API key to be available in the frontend
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY),
    'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(process.env.VITE_OPENAI_API_KEY),
    // Add more explicit definitions if needed
    'import.meta.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  // This should make Vite pick up VITE_ prefixed variables automatically
  envPrefix: 'VITE_',
  // Ensure proper handling of Node.js modules in Electron
  optimizeDeps: {
    exclude: ['electron'],
  },
})