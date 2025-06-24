import { app, BrowserWindow, ipcMain, globalShortcut, screen, desktopCapturer } from 'electron'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let isWindowVisible = false

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width: 400,
    height: 140,
    x: Math.floor(screenWidth / 2 - 200),
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
    minWidth: 300, 
    minHeight: 80,
    maxWidth: 600, 
    maxHeight: 300,
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
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
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
  const screenshotShortcut = 'Cmd+Shift+S' // New shortcut for quick screenshot
  
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

    // New shortcut for quick screenshot analysis
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
      // Get the primary screen (usually the first one)
      const primarySource = sources[0]
      return primarySource.thumbnail.toDataURL()
    }
    
    throw new Error('No screen sources available')
  } catch (error) {
    console.error('Error capturing screen:', error)
    throw error
  }
}

// Get available screens/displays
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

// Capture specific screen by ID
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

app.whenReady().then(() => {
  console.log('App ready, initializing...')
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

// IPC handlers
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
    const currentBounds = mainWindow.getBounds()
    const padding = 20
    const newWidth = Math.max(Math.min(width + padding, 600), 300)
    const newHeight = Math.max(Math.min(height + padding, 300), 80)
    
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

ipcMain.handle('set-window-position', async (event, { x, y }) => {
  if (mainWindow) {
    mainWindow.setPosition(Math.round(x), Math.round(y), false)
  }
})

ipcMain.handle('center-window', () => {
  centerWindow()
})

// New IPC handlers for screen capture
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