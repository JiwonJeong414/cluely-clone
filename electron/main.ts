// @ts-ignore
import { app, BrowserWindow, ipcMain, globalShortcut, screen, desktopCapturer } from 'electron'
import { join } from 'path'
import dotenv from 'dotenv'
import type { SyncProgress } from '../src/services/drive/DriveService'

// Load environment variables
dotenv.config()

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let isWindowVisible = false

// Service instances
let authService: any
let driveService: any
let dbService: any

async function initializeServices() {
  try {
    console.log('Initializing services...')
    
    // Dynamically import services
    const { DatabaseService } = await import('../src/database/DatabaseService')
    const { AuthService } = await import('../src/services/auth/AuthService')
    const { DriveService } = await import('../src/services/drive/DriveService')
    
    // Initialize database first
    dbService = DatabaseService.getInstance()
    await dbService.initialize()
    
    // Initialize auth service
    authService = AuthService.getInstance()
    await authService.loadUserFromStorage()
    
    // Initialize drive service
    driveService = DriveService.getInstance()
    
    console.log('✅ Services initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width: 500,
    height: 200, // Increased for Drive UI
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
    maxHeight: 600, // Increased for Drive content
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
  const screenshotShortcut = 'Cmd+Shift+S'
  const driveShortcut = 'Cmd+Shift+D' // New shortcut for Drive
  
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

    // New Drive shortcut
    globalShortcut.register(driveShortcut, () => {
      if (mainWindow) {
        mainWindow.webContents.send('toggle-drive-mode')
      }
    })

    console.log('Global shortcuts registered successfully')
    console.log('- Cmd+Space: Toggle window')
    console.log('- Cmd+Shift+C: Center window')
    console.log('- Cmd+Shift+S: Quick screenshot analysis')
    console.log('- Cmd+Shift+D: Toggle Drive mode')
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
    const newWidth = Math.max(Math.min(width + padding, 800), 400) // Updated max width
    const newHeight = Math.max(Math.min(height + padding, 600), 120) // Updated max height
    
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

// ========== NEW DRIVE IPC HANDLERS ==========

// Authentication handlers
ipcMain.handle('auth-get-user', async () => {
  try {
    return authService.getCurrentUser()
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
})

ipcMain.handle('auth-sign-in', async () => {
  try {
    const user = await authService.signInWithGoogle()
    return { success: true, user }
  } catch (error) {
    console.error('Error signing in:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Sign in failed' }
  }
})

ipcMain.handle('auth-sign-out', async () => {
  try {
    await authService.signOut()
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Sign out failed' }
  }
})

ipcMain.handle('auth-get-drive-connection', async () => {
  try {
    return authService.getDriveConnection()
  } catch (error) {
    console.error('Error getting drive connection:', error)
    return { isConnected: false }
  }
})

// Drive handlers
ipcMain.handle('drive-sync', async (event, options = {}) => {
  try {
    const limit = options.limit || 10
    
    const result = await driveService.syncFiles(
      (progress: SyncProgress) => {
        // Send progress updates to renderer
        mainWindow?.webContents.send('drive-sync-progress', progress)
      },
      limit
    )
    
    return { success: true, result }
  } catch (error) {
    console.error('Error syncing drive:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Sync failed' }
  }
})

ipcMain.handle('drive-search', async (event, query: string, limit = 5) => {
  try {
    const results = await driveService.searchDocuments(query, limit)
    return { success: true, results }
  } catch (error) {
    console.error('Error searching drive:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Search failed' }
  }
})

ipcMain.handle('drive-list-files', async (event, options = {}) => {
  try {
    const files = await driveService.listFiles(options)
    return { success: true, files }
  } catch (error) {
    console.error('Error listing files:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to list files' }
  }
})

ipcMain.handle('drive-delete-file', async (event, fileId: string) => {
  try {
    await driveService.deleteFile(fileId)
    return { success: true }
  } catch (error) {
    console.error('Error deleting file:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete file' }
  }
})

ipcMain.handle('drive-create-folder', async (event, name: string) => {
  try {
    const folderId = await driveService.createFolder(name)
    return { success: true, folderId }
  } catch (error) {
    console.error('Error creating folder:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create folder' }
  }
})

ipcMain.handle('drive-move-file', async (event, fileId: string, folderId: string) => {
  try {
    await driveService.moveFileToFolder(fileId, folderId)
    return { success: true }
  } catch (error) {
    console.error('Error moving file:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to move file' }
  }
})

// Database handlers
ipcMain.handle('db-get-indexed-files', async () => {
  try {
    const user = authService.getCurrentUser()
    if (!user) return { success: false, error: 'User not authenticated' }
    
    const files = await dbService.getDocuments(user.id)
    return { success: true, files }
  } catch (error) {
    console.error('Error getting indexed files:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get files' }
  }
})

ipcMain.handle('db-get-cleanup-candidates', async (event, maxFiles = 50) => {
  try {
    const user = authService.getCurrentUser()
    if (!user) return { success: false, error: 'User not authenticated' }
    
    // Get files that might be good candidates for cleanup
    const candidates = await dbService.getCleanupCandidates(user.id, maxFiles)
    return { success: true, candidates }
  } catch (error) {
    console.error('Error getting cleanup candidates:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get cleanup candidates' }
  }
})

// Cleanup batch operations
ipcMain.handle('drive-delete-files', async (event, fileIds: string[]) => {
  try {
    const results = []
    let successCount = 0
    let errorCount = 0
    
    for (const fileId of fileIds) {
      try {
        await driveService.deleteFile(fileId)
        results.push({ fileId, success: true })
        successCount++
      } catch (error) {
        results.push({ 
          fileId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
        errorCount++
      }
    }
    
    return { 
      success: true, 
      results, 
      summary: { 
        total: fileIds.length, 
        successful: successCount, 
        errors: errorCount 
      } 
    }
  } catch (error) {
    console.error('Error in batch delete:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Batch delete failed' }
  }
})

// Organization handlers
ipcMain.handle('drive-organize-files', async (event, organizationPlan) => {
  try {
    const user = authService.getCurrentUser()
    if (!user) return { success: false, error: 'User not authenticated' }
    
    // Import the organization service
    const { OrganizationService } = await import('../src/services/organization/OrganizationService')
    const orgService = new OrganizationService(driveService, dbService)
    
    const result = await orgService.executeOrganization(user.id, organizationPlan)
    return { success: true, result }
  } catch (error) {
    console.error('Error organizing files:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Organization failed' }
  }
})

ipcMain.handle('drive-analyze-for-organization', async (event, options = {}) => {
  try {
    const user = authService.getCurrentUser()
    if (!user) return { success: false, error: 'User not authenticated' }
    
    const { OrganizationService } = await import('../src/services/organization/OrganizationService')
    const orgService = new OrganizationService(driveService, dbService)
    
    const analysis = await orgService.analyzeForOrganization(user.id, options)
    return { success: true, analysis }
  } catch (error) {
    console.error('Error analyzing for organization:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Analysis failed' }
  }
})