// electron/main.ts - Simplified version without service imports
import { app, BrowserWindow, ipcMain, globalShortcut, screen, desktopCapturer } from 'electron'
import { join } from 'path'
// Add back full service imports at the top
import { DatabaseService } from '../src/database/DatabaseService'
import { AuthService } from '../src/services/auth/AuthService'
import { DriveService } from '../src/services/drive/DriveService'
import { VectorService } from '../src/services/vector/VectorService'
import { OrganizationService } from '../src/services/organization/OrganizationService'
import { CalendarService } from '../src/services/calendar/CalendarService'
import { MapsService } from '../src/services/maps/MapsService'
import dotenv from 'dotenv'

dotenv.config()

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let isWindowVisible = false

// Update service initialization
let dbService: DatabaseService
let authService: AuthService
let driveService: DriveService
let vectorService: VectorService
let organizationService: OrganizationService
let calendarService: CalendarService
let mapsService: MapsService

async function initializeServices() {
  try {
    console.log('Initializing services...')
    
    // Initialize database service first
    dbService = DatabaseService.getInstance()
    await dbService.initialize()
    console.log('✅ Database service initialized')
    
    // Initialize auth service
    authService = AuthService.getInstance()
    await authService.loadUserFromStorage()
    console.log('✅ Auth service initialized')
    
    // Initialize drive service
    driveService = DriveService.getInstance()
    console.log('✅ Drive service initialized')
    
    // Initialize vector service
    vectorService = VectorService.getInstance()
    const hasEmbeddingModel = await vectorService.checkEmbeddingModel()
    if (hasEmbeddingModel) {
      console.log('✅ Vector service initialized with embedding model')
    } else {
      console.log('⚠️ Vector service initialized but no embedding model found')
    }
    
    // Initialize organization service
    organizationService = new OrganizationService(driveService, dbService)
    console.log('✅ Organization service initialized')
    
    // Initialize calendar service
    calendarService = CalendarService.getInstance()
    console.log('✅ Calendar service initialized')
    
    // Initialize maps service
    mapsService = MapsService.getInstance()
    console.log('✅ Maps service initialized')
    
    console.log('✅ All services initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
    throw error
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
  const driveModeShortcut = 'Cmd+Shift+D'
  
  try {
    console.log('Attempting to register global shortcuts...')
    
    const testRegistered = globalShortcut.register(testShortcut, () => {
      console.log('✅ Test shortcut working')
      if (mainWindow) {
        mainWindow.webContents.send('shortcut-test-success')
      }
    })
    console.log('Test shortcut registration:', testRegistered ? 'SUCCESS' : 'FAILED')

    const toggleRegistered = globalShortcut.register(toggleShortcut, () => {
      console.log('Toggle shortcut triggered')
      toggleWindow()
    })
    console.log('Toggle shortcut registration:', toggleRegistered ? 'SUCCESS' : 'FAILED')

    const centerRegistered = globalShortcut.register(centerShortcut, () => {
      console.log('Center shortcut triggered')
      centerWindow()
    })
    console.log('Center shortcut registration:', centerRegistered ? 'SUCCESS' : 'FAILED')

    const screenshotRegistered = globalShortcut.register(screenshotShortcut, async () => {
      console.log('Screenshot shortcut triggered')
      if (mainWindow) {
        try {
          const screenshot = await captureScreen()
          mainWindow.webContents.send('screenshot-captured', screenshot)
        } catch (error) {
          console.error('Error capturing screenshot:', error)
        }
      }
    })
    console.log('Screenshot shortcut registration:', screenshotRegistered ? 'SUCCESS' : 'FAILED')

    // Try to register the primary drive mode shortcut
    const driveModeRegistered = globalShortcut.register(driveModeShortcut, async () => {
      console.log('🚀 Drive mode shortcut triggered')
      
      if (mainWindow) {
        // Check if window exists and webContents is ready
        if (mainWindow.webContents) {
          console.log('📤 Sending toggle-drive-mode event to renderer')
          
          // Send the event
          mainWindow.webContents.send('toggle-drive-mode')
          
          // Show and focus the window
          if (!mainWindow.isVisible()) {
            console.log('🔍 Window was hidden, showing it')
            mainWindow.show()
          }
          
          if (!mainWindow.isFocused()) {
            console.log('🎯 Window was not focused, focusing it')
            mainWindow.focus()
          }
          
          // Bring to front on macOS
          if (process.platform === 'darwin') {
            app.focus({ steal: true })
          }
          
          console.log('✅ Drive mode toggle completed')
        } else {
          console.error('❌ Window webContents not available')
        }
      } else {
        console.error('❌ Main window not available')
      }
    })
    console.log('Drive mode shortcut registration:', driveModeRegistered ? 'SUCCESS' : 'FAILED')

    console.log('Global shortcuts registered successfully')
    console.log('- Cmd+Space: Toggle window')
    console.log('- Cmd+Shift+C: Center window')
    console.log('- Cmd+Shift+S: Quick screenshot analysis')
    console.log('- Cmd+Shift+D: Toggle drive mode')
    console.log('- Cmd+Shift+T: Test shortcut')
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

// Authentication handlers - now functional
ipcMain.handle('auth-get-user', async () => {
  try {
    if (!authService) {
      console.log('Auth service not available')
      return null
    }
    return authService.getCurrentUser()
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
})

ipcMain.handle('auth-sign-in', async () => {
  try {
    if (!authService) {
      return { success: false, error: 'Auth service not available' }
    }
    
    const user = await authService.signInWithGoogle()
    return { success: true, user }
  } catch (error) {
    console.error('Error signing in:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Sign in failed' }
  }
})

ipcMain.handle('auth-sign-out', async () => {
  try {
    if (!authService) {
      return { success: false, error: 'Auth service not available' }
    }
    
    await authService.signOut()
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Sign out failed' }
  }
})

ipcMain.handle('auth-get-google-connection', async () => {
  try {
    if (!authService) {
      return { isConnected: false }
    }
    
    return authService.getGoogleConnection()
  } catch (error) {
    console.error('Error getting Google connection:', error)
    return { isConnected: false }
  }
})

// Keep the old handler for backward compatibility
ipcMain.handle('auth-get-drive-connection', async () => {
  try {
    if (!authService) {
      return { isConnected: false }
    }
    
    return authService.getGoogleConnection()
  } catch (error) {
    console.error('Error getting Google connection:', error)
    return { isConnected: false }
  }
})

// Replace all the stub Drive IPC handlers with these working ones:

// Drive sync handler
ipcMain.handle('drive-sync', async (event, options = {}) => {
  try {
    if (!driveService) {
      return { success: false, error: 'Drive service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log('🚀 Starting enhanced Drive sync...')
    
    // Extract options with defaults
    const { 
      limit = 10, 
      force = false,
      strategy = 'new_files_only'
    } = options

    // Enhanced sync with web app logic
    const result = await driveService.syncFiles(
      (progress) => {
        // Send progress updates to renderer
        if (mainWindow) {
          mainWindow.webContents.send('drive-sync-progress', progress)
        }
      },
      { limit, force, strategy }
    )
    
    console.log('✅ Enhanced Drive sync completed:', result)
    return { success: true, result }
  } catch (error) {
    console.error('❌ Enhanced Drive sync error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Sync failed' 
    }
  }
})

// Add new handlers for different sync strategies
ipcMain.handle('drive-sync-force', async (event, options = {}) => {
  try {
    if (!driveService) {
      return { success: false, error: 'Drive service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log('🔄 Starting force sync...')
    
    const result = await driveService.forceSyncFiles(
      (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('drive-sync-progress', progress)
        }
      },
      options.limit || 10
    )
    
    console.log('✅ Force sync completed:', result)
    return { success: true, result }
  } catch (error) {
    console.error('❌ Force sync error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Force sync failed' 
    }
  }
})

ipcMain.handle('drive-sync-new', async (event, options = {}) => {
  try {
    if (!driveService) {
      return { success: false, error: 'Drive service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log('🆕 Starting new files sync...')
    
    const result = await driveService.syncNewFiles(
      (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('drive-sync-progress', progress)
        }
      },
      options.limit || 10
    )
    
    console.log('✅ New files sync completed:', result)
    return { success: true, result }
  } catch (error) {
    console.error('❌ New files sync error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'New files sync failed' 
    }
  }
})

// Add sync stats handler
ipcMain.handle('drive-get-sync-stats', async () => {
  try {
    if (!driveService) {
      return { success: false, error: 'Drive service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    const stats = await driveService.getSyncStats(user.id)
    return { success: true, stats }
  } catch (error) {
    console.error('❌ Get sync stats error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Get stats failed' 
    }
  }
})

// Drive search handler
ipcMain.handle('drive-search', async (event, query, limit = 5) => {
  try {
    if (!driveService) {
      return { success: false, error: 'Drive service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log(`🔍 Searching Drive for: "${query}"`)
    
    const results = await driveService.searchDocuments(query, limit)
    
    console.log(`✅ Found ${results.length} results`)
    return { success: true, results }
  } catch (error) {
    console.error('❌ Drive search error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Search failed' 
    }
  }
})

// Drive list files handler
ipcMain.handle('drive-list-files', async (event, options = {}) => {
  try {
    if (!driveService) {
      return { success: false, error: 'Drive service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    const files = await driveService.listFiles(options)
    return { success: true, files }
  } catch (error) {
    console.error('❌ Drive list files error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'List files failed' 
    }
  }
})

// Drive delete file handler
ipcMain.handle('drive-delete-file', async (event, fileId) => {
  try {
    if (!driveService) {
      return { success: false, error: 'Drive service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    await driveService.deleteFile(fileId)
    console.log(`✅ Deleted file: ${fileId}`)
    return { success: true }
  } catch (error) {
    console.error(`❌ Drive delete file error:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Delete failed' 
    }
  }
})

// Drive delete multiple files handler
ipcMain.handle('drive-delete-files', async (event, fileIds) => {
  try {
    if (!driveService) {
      return { success: false, error: 'Drive service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
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
          error: error instanceof Error ? error.message : 'Delete failed' 
        })
        errorCount++
      }
    }
    
    // Log cleanup activity
    await dbService.logCleanupActivity(user.id, {
      filesDeleted: successCount,
      filesRequested: fileIds.length,
      errors: errorCount,
      deletedFileNames: fileIds // This should ideally be file names, but we have IDs
    })
    
    console.log(`✅ Deleted ${successCount}/${fileIds.length} files`)
    return { 
      success: true, 
      results,
      summary: { total: fileIds.length, deleted: successCount, errors: errorCount }
    }
  } catch (error) {
    console.error('❌ Drive delete files error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Bulk delete failed' 
    }
  }
})

// Drive create folder handler
ipcMain.handle('drive-create-folder', async (event, name) => {
  try {
    if (!driveService) {
      return { success: false, error: 'Drive service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    const folderId = await driveService.createFolder(name)
    console.log(`✅ Created folder: ${name} (${folderId})`)
    return { success: true, folderId }
  } catch (error) {
    console.error('❌ Drive create folder error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Create folder failed' 
    }
  }
})

// Drive move file handler
ipcMain.handle('drive-move-file', async (event, fileId, folderId) => {
  try {
    if (!driveService) {
      return { success: false, error: 'Drive service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    await driveService.moveFileToFolder(fileId, folderId)
    console.log(`✅ Moved file ${fileId} to folder ${folderId}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Drive move file error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Move file failed' 
    }
  }
})

// Drive organize files handler
ipcMain.handle('drive-organize-files', async (event, plan) => {
  try {
    if (!organizationService) {
      return { success: false, error: 'Organization service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log('🗂️ Starting file organization...')
    const result = await organizationService.executeOrganization(user.id, plan)
    
    console.log('✅ File organization completed:', result)
    return { success: true, result }
  } catch (error) {
    console.error('❌ Drive organize files error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Organization failed' 
    }
  }
})

// Drive analyze for organization handler
ipcMain.handle('drive-analyze-for-organization', async (event, options = {}) => {
  try {
    if (!organizationService) {
      return { success: false, error: 'Organization service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log('🔍 Analyzing files for organization...')
    const analysis = await organizationService.analyzeForOrganization(user.id, options)
    
    console.log(`✅ Analysis completed: ${analysis.clusters.length} clusters found`)
    return { success: true, analysis }
  } catch (error) {
    console.error('❌ Drive analyze error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Analysis failed' 
    }
  }
})

// Database get indexed files handler
ipcMain.handle('db-get-indexed-files', async () => {
  try {
    if (!vectorService) {
      return { success: false, error: 'Vector service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    const files = await vectorService.getUserIndexedFiles(user.id)
    return { success: true, files }
  } catch (error) {
    console.error('❌ Get indexed files error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Get indexed files failed' 
    }
  }
})

// Database get cleanup candidates handler
ipcMain.handle('db-get-cleanup-candidates', async (event, maxFiles = 50) => {
  try {
    if (!dbService) {
      return { success: false, error: 'Database service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    const candidates = await dbService.getCleanupCandidates(user.id, maxFiles)
    return { success: true, candidates }
  } catch (error) {
    console.error('❌ Get cleanup candidates error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Get cleanup candidates failed' 
    }
  }
})

// Calendar events handler
ipcMain.handle('calendar-get-events', async (event, timeRange?: { start?: string, end?: string }) => {
  try {
    if (!calendarService) {
      return { success: false, error: 'Calendar service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log('🗓️ Fetching calendar events...')
    
    let events
    if (timeRange?.start && timeRange?.end) {
      events = await calendarService.getEventsForDateRange(
        new Date(timeRange.start),
        new Date(timeRange.end)
      )
    } else {
      events = await calendarService.getUpcomingEvents()
    }
    
    console.log(`✅ Found ${events.length} calendar events`)
    return { success: true, events }
  } catch (error) {
    console.error('❌ Calendar get events error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get events' 
    }
  }
})

// Today's events handler
ipcMain.handle('calendar-get-today', async () => {
  try {
    if (!calendarService) {
      return { success: false, error: 'Calendar service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log('📅 Fetching today\'s events...')
    
    const events = await calendarService.getTodaysEvents()
    
    console.log(`✅ Found ${events.length} events for today`)
    return { success: true, events }
  } catch (error) {
    console.error('❌ Calendar get today error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get today\'s events' 
    }
  }
})

// This week's events handler
ipcMain.handle('calendar-get-week', async () => {
  try {
    if (!calendarService) {
      return { success: false, error: 'Calendar service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log('📅 Fetching this week\'s events...')
    
    const events = await calendarService.getThisWeeksEvents()
    
    console.log(`✅ Found ${events.length} events for this week`)
    return { success: true, events }
  } catch (error) {
    console.error('❌ Calendar get week error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get week\'s events' 
    }
  }
})

// Next week's events handler
ipcMain.handle('calendar-get-next-week', async () => {
  try {
    if (!calendarService) {
      return { success: false, error: 'Calendar service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log('📅 Fetching next week\'s events...')
    
    const events = await calendarService.getNextWeeksEvents()
    
    console.log(`✅ Found ${events.length} events for next week`)
    return { success: true, events }
  } catch (error) {
    console.error('❌ Calendar get next week error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get next week\'s events' 
    }
  }
})

// Calendar analysis handler - this is the key one for AI integration
ipcMain.handle('calendar-analyze', async (event, query: string) => {
  try {
    if (!calendarService) {
      return { success: false, error: 'Calendar service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log(`🤖 Analyzing calendar for query: "${query}"`)
    
    const analysis = await calendarService.analyzeSchedule(query)
    
    console.log(`✅ Calendar analysis completed: ${analysis.events.length} events, ${analysis.insights.length} insights`)
    return { success: true, analysis }
  } catch (error) {
    console.error('❌ Calendar analyze error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to analyze calendar' 
    }
  }
})

// Calendar context for AI - simplified context string
ipcMain.handle('calendar-get-context', async (event, query: string) => {
  try {
    if (!calendarService) {
      return { success: false, error: 'Calendar service not available' }
    }
    
    const user = authService.getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }
    
    console.log(`📋 Getting calendar context for query: "${query}"`)
    
    const context = await calendarService.getCalendarContext(query)
    
    console.log(`✅ Calendar context generated (${context.length} characters)`)
    return { success: true, context }
  } catch (error) {
    console.error('❌ Calendar get context error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get calendar context' 
    }
  }
})

// Maps search handler
ipcMain.handle('maps-search', async (event, query: string, options?: any) => {
  try {
    if (!mapsService) {
      return { success: false, error: 'Maps service not available' }
    }
    
    console.log(`🗺️ Searching maps for: "${query}"`)
    
    // Get location from renderer process if not provided
    let location = options?.location
    if (!location) {
      try {
        const locationResult = await event.sender.executeJavaScript(`
          new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error('Geolocation not supported'));
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
              (error) => reject(error),
              { enableHighAccuracy: true, timeout: 10000 }
            );
          });
        `)
        location = locationResult
        console.log('📍 Got location from renderer:', location)
      } catch (locationError) {
        console.error('❌ Failed to get location:', locationError)
        return { 
          success: false, 
          error: 'Failed to get your location. Please enable location access and try again.' 
        }
      }
    }
    
    const searchOptions = { ...options, location }
    const places = await mapsService.searchNearby(query, searchOptions)
    
    console.log(`✅ Found ${places.length} places`)
    return { success: true, places }
  } catch (error) {
    console.error('❌ Maps search error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Maps search failed' 
    }
  }
})

// Get current location handler
ipcMain.handle('maps-get-location', async (event) => {
  try {
    console.log('📍 Getting location from renderer process...')
    
    const location = await event.sender.executeJavaScript(`
      new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    `)
    
    console.log('✅ Got location:', location)
    return { success: true, location }
  } catch (error) {
    console.error('❌ Get location error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get location' 
    }
  }
})

// Get place details handler
ipcMain.handle('maps-get-place-details', async (event, placeId: string) => {
  try {
    if (!mapsService) {
      return { success: false, error: 'Maps service not available' }
    }
    
    const place = await mapsService.getPlaceDetails(placeId)
    return { success: true, place }
  } catch (error) {
    console.error('❌ Get place details error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get place details' 
    }
  }
})

// Travel time handler
ipcMain.handle('maps-get-travel-time', async (event, origin: any, destination: any, mode?: 'driving' | 'walking' | 'transit') => {
  try {
    if (!mapsService) {
      return { success: false, error: 'Maps service not available' }
    }
    
    const travelInfo = await mapsService.getTravelTime(origin, destination, mode)
    return { success: true, travelInfo }
  } catch (error) {
    console.error('❌ Get travel time error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get travel time' 
    }
  }
})