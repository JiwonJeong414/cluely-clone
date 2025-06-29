import { ipcMain, desktopCapturer } from 'electron'

export function setupScreenCaptureHandlers() {
  // Capture screen
  ipcMain.handle('capture-screen', async () => {
    try {
      return await captureScreen()
    } catch (error) {
      console.error('IPC: Error capturing screen:', error)
      throw error
    }
  })

  // Get available screens
  ipcMain.handle('get-available-screens', async () => {
    try {
      return await getAvailableScreens()
    } catch (error) {
      console.error('IPC: Error getting available screens:', error)
      throw error
    }
  })

  // Capture screen by ID
  ipcMain.handle('capture-screen-by-id', async (event, sourceId: string) => {
    try {
      return await captureScreenById(sourceId)
    } catch (error) {
      console.error('IPC: Error capturing screen by ID:', error)
      throw error
    }
  })

  // Debug API key handler
  ipcMain.handle('debug-api-key', async () => {
    return {
      mainProcess: {
        googleMapsKey: !!process.env.GOOGLE_MAPS_API_KEY,
        viteKey: !!process.env.VITE_GOOGLE_MAPS_API_KEY,
        googlePreview: process.env.GOOGLE_MAPS_API_KEY?.substring(0, 12) + '...',
        vitePreview: process.env.VITE_GOOGLE_MAPS_API_KEY?.substring(0, 12) + '...',
        nodeEnv: process.env.NODE_ENV,
        allEnvKeys: Object.keys(process.env).filter(key => key.includes('GOOGLE') || key.includes('API'))
      }
    }
  })
}

// Screen capture utility functions
async function captureScreen(): Promise<string> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    })
    
    if (sources.length > 0) {
      const primarySource = sources[0]
      return primarySource.thumbnail.toDataURL()
    }
    
    throw new Error('No screen sources available')
  } catch (error) {
    console.error('Error capturing screen:', error)
    throw error
  }
}

async function getAvailableScreens() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 300, height: 200 }
    })
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      display_id: source.display_id
    }))
  } catch (error) {
    console.error('Error getting available screens:', error)
    return []
  }
}

async function captureScreenById(sourceId: string): Promise<string> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 1920, height: 1080 }
    })
    
    const source = sources.find(s => s.id === sourceId)
    if (!source) {
      throw new Error(`Screen source with ID ${sourceId} not found`)
    }
    
    return source.thumbnail.toDataURL()
  } catch (error) {
    console.error('Error capturing screen by ID:', error)
    throw error
  }
}