import { app, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron'
import { join } from 'path'

console.log('🚀 MAIN.TS IS LOADING!!!')
console.log('🚀 MAIN.TS IS LOADING!!!')
console.log('🚀 MAIN.TS IS LOADING!!!')

const isDev = process.env.NODE_ENV === 'development'
console.log('🔧 isDev:', isDev)

let mainWindow: BrowserWindow | null = null
let isWindowVisible = false

function createWindow() {
  console.log('🏗️ CREATE WINDOW FUNCTION CALLED!!!')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize
  console.log('📺 Screen width:', screenWidth)

  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    x: Math.floor(screenWidth / 2 - 200),
    y: 50,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    // Floating window properties
    show: isDev, // Show immediately in dev mode for debugging
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: true,
    fullscreenable: false,
    skipTaskbar: true,
    titleBarStyle: 'hidden',
    minWidth: 300,
    minHeight: 200,
    maxWidth: 800,
    maxHeight: 600,
  })

  console.log('🪟 Window created with options')

  // Load the app
  if (isDev) {
    console.log('🌐 Loading dev URL...')
    mainWindow.loadURL('http://localhost:5173')
    console.log('🔧 Opening dev tools...')
    mainWindow.webContents.openDevTools() // ENABLE DEV TOOLS
    console.log('Loading dev URL: http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Set initial visibility state
  isWindowVisible = isDev
  console.log('👁️ Initial visibility:', isWindowVisible)

  // Handle window events
  mainWindow.on('closed', () => {
    console.log('🗑️ Window closed')
    mainWindow = null
  })

  mainWindow.on('blur', () => {
    console.log('😵‍💫 Window lost focus')
  })

  // Enhanced logging for content loading
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('🔄 Window started loading content...')
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Window finished loading content')
    console.log('🔍 Window visibility:', isWindowVisible)
  })

  mainWindow.webContents.on('dom-ready', () => {
    console.log('🎯 DOM is ready')
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Failed to load content:', errorCode, errorDescription)
  })

  // Log when window becomes visible
  mainWindow.on('show', () => {
    console.log('👁️ Window is now visible')
  })

  mainWindow.on('hide', () => {
    console.log('🙈 Window is now hidden')
  })
}

function showWindow() {
  if (mainWindow && !isWindowVisible) {
    console.log('🔍 Showing window...')
    mainWindow.show()
    mainWindow.focus()
    isWindowVisible = true
  }
}

function hideWindow() {
  if (mainWindow && isWindowVisible) {
    console.log('🙈 Hiding window...')
    mainWindow.hide()
    isWindowVisible = false
  }
}

function toggleWindow() {
  console.log('🔄 Toggle window called, current visibility:', isWindowVisible)
  if (isWindowVisible) {
    hideWindow()
  } else {
    showWindow()
  }
}

function registerGlobalShortcuts() {
  console.log('Attempting to register global shortcuts...')
  console.log('Platform:', process.platform)
  
  // Test if global shortcuts are working at all
  const testShortcut = 'Cmd+Shift+T'
  try {
    const testSuccess = globalShortcut.register(testShortcut, () => {
      console.log('🎉 TEST SHORTCUT WORKED! Global shortcuts are functioning!')
      // Show a notification or alert to confirm it worked
      if (mainWindow) {
        mainWindow.webContents.send('shortcut-test-success')
      }
    })
    
    if (testSuccess) {
      console.log(`✅ Test shortcut registered: ${testShortcut}`)
    } else {
      console.log(`❌ Test shortcut failed: ${testShortcut}`)
    }
  } catch (error) {
    console.error(`Error registering test shortcut:`, error)
  }
  
  // Main toggle shortcut - Cmd+Space (or Ctrl+Space on other platforms)
  const toggleShortcut = process.platform === 'darwin' ? 'Cmd+Space' : 'Ctrl+Space'
  
  try {
    const success1 = globalShortcut.register(toggleShortcut, () => {
      console.log(`${toggleShortcut} pressed - toggling window`)
      toggleWindow()
    })
    
    if (success1) {
      console.log(`✅ Successfully registered: ${toggleShortcut}`)
    } else {
      console.log(`❌ Failed to register: ${toggleShortcut}`)
    }
  } catch (error) {
    console.error(`Error registering ${toggleShortcut}:`, error)
  }

  // Alternative shortcut - Cmd+Shift+A
  try {
    const success2 = globalShortcut.register('Cmd+Shift+A', () => {
      console.log('Cmd+Shift+A pressed - toggling window')
      toggleWindow()
    })
    
    if (success2) {
      console.log('✅ Successfully registered: Cmd+Shift+A')
    } else {
      console.log('❌ Failed to register: Cmd+Shift+A')
    }
  } catch (error) {
    console.error('Error registering Cmd+Shift+A:', error)
  }

  // Test shortcut registration
  const registeredShortcuts = globalShortcut.isRegistered(toggleShortcut)
  console.log(`Is ${toggleShortcut} registered?`, registeredShortcuts)
  
  console.log('Global shortcuts registration complete')
  console.log(`- ${testShortcut}: Test shortcut (should work)`)
  console.log(`- ${toggleShortcut}: Toggle window`)
  console.log('- Cmd+Shift+A: Toggle window (alternative)')
  
  // Check if we're on macOS and provide helpful info
  if (process.platform === 'darwin') {
    console.log('💡 On macOS, you may need to grant Accessibility permissions:')
    console.log('   System Preferences > Security & Privacy > Privacy > Accessibility')
    console.log('   Add your app to the list of allowed applications')
  }
}

// App event handlers
app.whenReady().then(() => {
  console.log('🚀 APP IS READY!!!')
  console.log('🚀 APP IS READY!!!')
  console.log('🚀 APP IS READY!!!')
  console.log('App is ready, creating window...')
  createWindow()
  console.log('Window created, registering global shortcuts...')
  registerGlobalShortcuts()
  console.log('App initialization complete')
  console.log('✅ EVERYTHING SHOULD BE DONE NOW')
})

app.on('window-all-closed', () => {
  // Keep app running even when window is closed
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
  // Unregister all shortcuts
  globalShortcut.unregisterAll()
})

// Security: Prevent new window creation
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
  console.log('🔄 IPC: update-content-dimensions called with:', { width, height })
  
  if (!mainWindow) {
    console.log('❌ No main window available')
    return
  }

  if (!width || !height || width <= 0 || height <= 0) {
    console.log('❌ Invalid dimensions:', { width, height })
    return
  }

  try {
    const currentBounds = mainWindow.getBounds()
    console.log('📍 Current bounds:', currentBounds)
    
    // Add some padding but keep it reasonable
    const padding = 16
    const newWidth = Math.max(Math.min(width + padding, 800), 300) // Clamp between 300-800
    const newHeight = Math.max(Math.min(height + padding, 600), 200) // Clamp between 200-600
    
    // Keep the window centered horizontally, but maintain Y position
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth } = primaryDisplay.workAreaSize
    const newX = Math.floor(screenWidth / 2 - newWidth / 2)
    
    const newBounds = {
      x: newX,
      y: currentBounds.y,
      width: newWidth,
      height: newHeight
    }
    
    console.log('🎯 Setting new bounds:', newBounds)
    
    // Use setSize instead of setBounds for more reliable resizing
    mainWindow.setSize(newWidth, newHeight, true) // animate = true
    mainWindow.setPosition(newX, currentBounds.y, true) // animate = true
    
    console.log('✅ Window resized successfully')
  } catch (error) {
    console.error('❌ Error updating window dimensions:', error)
  }
})

// Handle shortcut test success
ipcMain.on('shortcut-test-success', () => {
  console.log('Shortcut test success received from renderer')
})

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  app.quit()
})