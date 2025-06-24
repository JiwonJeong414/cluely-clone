import { app, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let isWindowVisible = false

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width: 400,
    height: 200,
    x: Math.floor(screenWidth / 2 - 200), // Center horizontally
    y: 50, // Near top of screen
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    // Floating window properties
    show: false,
    alwaysOnTop: true,
    frame: false, // Remove window frame
    transparent: true,
    resizable: true, // Allow resizing for dynamic content
    fullscreenable: false,
    skipTaskbar: true, // Don't show in taskbar
    // macOS specific
    titleBarStyle: 'hidden',
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // Comment this out for floating mode
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Start hidden
  isWindowVisible = false

  // Handle window events
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('blur', () => {
    // Hide window when it loses focus (optional)
    // hideWindow()
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

function toggleWindow() {
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
  console.log('App is ready, creating window...')
  createWindow()
  console.log('Window created, registering global shortcuts...')
  registerGlobalShortcuts()
  console.log('App initialization complete')
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
  if (mainWindow && width && height) {
    const currentBounds = mainWindow.getBounds()
    console.log('📍 Current bounds:', currentBounds)
    const newBounds = {
      x: currentBounds.x,
      y: currentBounds.y,
      width: Math.max(width + 32, 300), // Add padding and minimum width
      height: Math.max(height + 32, 200) // Add padding and minimum height
    }
    console.log('🎯 Setting new bounds:', newBounds)
    mainWindow.setBounds(newBounds)
  } else {
    console.log('❌ Cannot update dimensions:', { mainWindow: !!mainWindow, width, height })
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