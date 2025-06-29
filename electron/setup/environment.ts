import dotenv from 'dotenv'
import { resolve, join } from 'path'
import { app } from 'electron'

export function setupEnvironment() {
  // Try multiple paths for .env file
  const envPaths = [
    resolve(__dirname, '../.env'),           // Development
    resolve(__dirname, '../../.env'),        // Built app
    join(process.cwd(), '.env'),            // Current working directory
    join(app.getAppPath(), '.env'),         // App path
    join(app.getAppPath(), '../.env'),      // App parent path
  ]

  console.log('🔍 Looking for .env file in these locations:')
  envPaths.forEach(path => console.log('  -', path))

  // Try to load .env from multiple locations
  let envLoaded = false
  for (const envPath of envPaths) {
    try {
      const result = dotenv.config({ path: envPath })
      if (!result.error) {
        console.log('[✓] Successfully loaded .env from:', envPath)
        envLoaded = true
        break
      }
    } catch (error) {
      // Continue to next path
    }
  }

  if (!envLoaded) {
    console.log('No .env file found, using system environment variables only')
  }

  // Debug logging for API key troubleshooting
  logEnvironmentDebugInfo()
}

function logEnvironmentDebugInfo() {
  console.log('🔍 MAIN PROCESS DEBUG:')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('Current working directory:', process.cwd())
  console.log('App path:', app.getAppPath())
  console.log('__dirname:', __dirname)
  console.log('GOOGLE_MAPS_API_KEY exists:', !!process.env.GOOGLE_MAPS_API_KEY)
  console.log('VITE_GOOGLE_MAPS_API_KEY exists:', !!process.env.VITE_GOOGLE_MAPS_API_KEY)
  console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY)
  console.log('VITE_OPENAI_API_KEY exists:', !!process.env.VITE_OPENAI_API_KEY)

  // Show first 12 characters of API keys if they exist
  if (process.env.GOOGLE_MAPS_API_KEY) {
    console.log('GOOGLE_MAPS_API_KEY preview:', process.env.GOOGLE_MAPS_API_KEY.substring(0, 12) + '...')
  }
  if (process.env.VITE_GOOGLE_MAPS_API_KEY) {
    console.log('VITE_GOOGLE_MAPS_API_KEY preview:', process.env.VITE_GOOGLE_MAPS_API_KEY.substring(0, 12) + '...')
  }
  if (process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY preview:', process.env.OPENAI_API_KEY.substring(0, 12) + '...')
  }
  if (process.env.VITE_OPENAI_API_KEY) {
    console.log('VITE_OPENAI_API_KEY preview:', process.env.VITE_OPENAI_API_KEY.substring(0, 12) + '...')
  }

  // List all environment variables that contain 'GOOGLE' or 'API'
  const relevantEnvVars = Object.keys(process.env).filter(key => 
    key.includes('GOOGLE') || key.includes('API') || key.includes('MAPS') || key.includes('OPENAI')
  )
  console.log('Relevant environment variables found:', relevantEnvVars)

  // Check OpenAI API key availability
  if (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY) {
    console.log('[✓] OpenAI API key found, audio processing will be available')
  } else {
    console.log('OPENAI_API_KEY not found, audio processing will be limited')
  }
}