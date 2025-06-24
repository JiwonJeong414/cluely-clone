// electron/main.ts - Simplified version without service imports
import { app, BrowserWindow, ipcMain, globalShortcut, screen, desktopCapturer } from 'electron'
import { join } from 'path'
// Remove service imports temporarily
// import dotenv from 'dotenv'

// dotenv.config()

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let isWindowVisible = false

// Temporarily disable services
// let authService: any
// let driveService: any
// let dbService: any

async function initializeServices() {
  try {
    console.log('Initializing basic services...')
    // Temporarily disabled - services will be added back later
    console.log('✅ Basic services initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width: 500,
    height: 200,
    x: Math.floor(screenWidth / 2 - 250),
    y: 80,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    show: isDev,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: -100, y: -100 }, 
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    minWidth: 400, 
    minHeight: 120,
    maxWidth: 800, 
    maxHeight: 600,
    movable: true,
    useContentSize: false,
    thickFrame: false,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
    
    mainWindow.webContents.on('console-message', (event, level, message) => {
      if (message.includes('Autofill') || message.includes('SharedImageManager')) {
        event.preventDefault()
      }
    })
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'))
  }

  isWindowVisible = isDev

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window content loaded')
  })
}

function showWindow() {
  if (mainWindow && !isWindowVisible) {
    mainWindow.show()
    mainWindow.focus()
    isWindowVisible = true
  }
}

function hideWindow() {
  if (mainWindow && isWindowVisible) {
    mainWindow.hide()
    isWindowVisible = false
  }
}

function centerWindow() {
  if (mainWindow) {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
    const bounds = mainWindow.getBounds()
    
    const newX = Math.floor(screenWidth / 2 - bounds.width / 2)
    const newY = Math.floor(screenHeight / 3)
    
    mainWindow.setPosition(newX, newY, true)
    console.log('Window centered')
  }
}

function toggleWindow() {
  console.log('Toggle window, current visibility:', isWindowVisible)
  if (isWindowVisible) {
    hideWindow()
  } else {
    showWindow()
  }
}

function registerGlobalShortcuts() {
  const testShortcut = 'Cmd+Shift+T'
  const toggleShortcut = process.platform === 'darwin' ? 'Cmd+Space' : 'Ctrl+Space'
  const centerShortcut = 'Cmd+Shift+C'
  const screenshotShortcut = 'Cmd+Shift+S'
  
  try {
    globalShortcut.register(testShortcut, () => {
      console.log('Test shortcut working')
      if (mainWindow) {
        mainWindow.webContents.send('shortcut-test-success')
      }
    })

    globalShortcut.register(toggleShortcut, () => {
      toggleWindow()
    })

    globalShortcut.register('Cmd+Shift+A', () => {
      toggleWindow()
    })

    globalShortcut.register(centerShortcut, () => {
      centerWindow()
    })

    globalShortcut.register(screenshotShortcut, async () => {
      if (mainWindow) {
        try {
          const screenshot = await captureScreen()
          mainWindow.webContents.send('screenshot-captured', screenshot)
        } catch (error) {
          console.error('Error capturing screenshot:', error)
        }
      }
    })

    console.log('Global shortcuts registered successfully')
    console.log('- Cmd+Space: Toggle window')
    console.log('- Cmd+Shift+C: Center window')
    console.log('- Cmd+Shift+S: Quick screenshot analysis')
  } catch (error) {
    console.error('Error registering shortcuts:', error)
  }
}

// Screen capture functionality
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

app.whenReady().then(async () => {
  console.log('App ready, initializing...')
  await initializeServices()
  createWindow()
  registerGlobalShortcuts()
  console.log('Initialization complete')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' }
  })
})

// Basic IPC handlers - only the core functionality
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('toggle-window', () => {
  toggleWindow()
})

ipcMain.handle('hide-window', () => {
  hideWindow()
})

ipcMain.handle('show-window', () => {
  showWindow()
})

ipcMain.handle('update-content-dimensions', async (event, { width, height }) => {
  console.log('Updating window dimensions:', { width, height })
  
  if (!mainWindow || !width || !height || width <= 0 || height <= 0) {
    return
  }

  try {
    const padding = 20
    const newWidth = Math.max(Math.min(width + padding, 800), 400)
    const newHeight = Math.max(Math.min(height + padding, 600), 120)
    
    mainWindow.setSize(newWidth, newHeight, true)
    console.log('Window resized successfully')
  } catch (error) {
    console.error('Error updating window dimensions:', error)
  }
})

ipcMain.handle('drag-window', async (event, { deltaX, deltaY }) => {
  if (mainWindow) {
    const currentBounds = mainWindow.getBounds()
    const newX = currentBounds.x + deltaX
    const newY = currentBounds.y + deltaY
    
    mainWindow.setPosition(newX, newY, false)
  }
})

ipcMain.handle('center-window', () => {
  centerWindow()
})

// Screen capture IPC handlers
ipcMain.handle('capture-screen', async () => {
  try {
    return await captureScreen()
  } catch (error) {
    console.error('IPC: Error capturing screen:', error)
    throw error
  }
})

ipcMain.handle('get-available-screens', async () => {
  try {
    return await getAvailableScreens()
  } catch (error) {
    console.error('IPC: Error getting available screens:', error)
    throw error
  }
})

ipcMain.handle('capture-screen-by-id', async (event, sourceId: string) => {
  try {
    return await captureScreenById(sourceId)
  } catch (error) {
    console.error('IPC: Error capturing screen by ID:', error)
    throw error
  }
})

ipcMain.on('shortcut-test-success', () => {
  console.log('Shortcut test success received')
})

// Stub Drive IPC handlers that return "not implemented" messages
ipcMain.handle('auth-get-user', async () => {
  console.log('auth-get-user called - Drive features disabled')
  return null
})

ipcMain.handle('auth-sign-in', async () => {
  console.log('auth-sign-in called - Drive features disabled')
  return { success: false, error: 'Drive features are temporarily disabled. Screenshot functionality is available.' }
})

ipcMain.handle('auth-sign-out', async () => {
  console.log('auth-sign-out called - Drive features disabled')
  return { success: false, error: 'Drive features are temporarily disabled.' }
})

ipcMain.handle('auth-get-drive-connection', async () => {
  console.log('auth-get-drive-connection called - Drive features disabled')
  return { isConnected: false }
})

ipcMain.handle('drive-sync', async () => {
  return { success: false, error: 'Drive features not implemented yet' }
})

ipcMain.handle('drive-search', async () => {
  return { success: false, error: 'Drive features not implemented yet' }
})

ipcMain.handle('drive-list-files', async () => {
  return { success: false, error: 'Drive features not implemented yet' }
})

ipcMain.handle('drive-delete-file', async () => {
  return { success: false, error: 'Drive features not implemented yet' }
})

ipcMain.handle('drive-delete-files', async () => {
  return { success: false, error: 'Drive features not implemented yet' }
})

ipcMain.handle('drive-create-folder', async () => {
  return { success: false, error: 'Drive features not implemented yet' }
})

ipcMain.handle('drive-move-file', async () => {
  return { success: false, error: 'Drive features not implemented yet' }
})

ipcMain.handle('drive-organize-files', async () => {
  return { success: false, error: 'Drive features not implemented yet' }
})

ipcMain.handle('drive-analyze-for-organization', async () => {
  return { success: false, error: 'Drive features not implemented yet' }
})

ipcMain.handle('db-get-indexed-files', async () => {
  return { success: false, error: 'Drive features not implemented yet' }
})

ipcMain.handle('db-get-cleanup-candidates', async () => {
  return { success: false, error: 'Drive features not implemented yet' }
})