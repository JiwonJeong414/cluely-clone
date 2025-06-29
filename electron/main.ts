import { app, BrowserWindow, ipcMain, globalShortcut, screen, desktopCapturer, shell } from 'electron'
import { join } from 'path'
import dotenv from 'dotenv'

// Import services
import { DatabaseService } from '../src/services/database/DatabaseService'
import { AuthService } from '../src/services/auth/AuthService'
import { DriveService } from '../src/services/drive/DriveService'
import { VectorService } from '../src/services/vector/VectorService'
import { OrganizationService } from '../src/services/organization/OrganizationService'
import { CalendarService } from '../src/services/calendar/CalendarService'
import { MapsService } from '../src/services/maps/MapsService'
import { AudioService } from '../src/services/audio/AudioService'
import { GoogleDocsService } from '../src/services/docs/GoogleDocsService'

// Import handlers
import { setupEnvironment } from './setup/environment'
import { setupWindowHandlers } from './handlers/windowHandlers'
import { setupAuthHandlers } from './handlers/authHandlers'
import { setupDriveHandlers } from './handlers/driveHandlers'
import { setupOrganizationHandlers } from './handlers/organizationHandlers'
import { setupCalendarHandlers } from './handlers/calendarHandlers'
import { setupMapsHandlers } from './handlers/mapsHandlers'
import { setupAudioHandlers } from './handlers/audioHandlers'
import { setupDocsHandlers } from './handlers/docsHandlers'
import { setupScreenCaptureHandlers } from './handlers/screenCaptureHandlers'

// Types
interface AppServices {
  db: DatabaseService
  auth: AuthService
  drive: DriveService
  vector: VectorService
  organization: OrganizationService
  calendar: CalendarService
  maps: MapsService
  audio: AudioService
  docs: GoogleDocsService
}

class WingmanApp {
  private mainWindow: BrowserWindow | null = null
  private isWindowVisible = false
  private services: AppServices | null = null
  private isDev = process.env.NODE_ENV === 'development'

  constructor() {
    this.setupApp()
  }

  private setupApp() {
    // Setup environment variables
    setupEnvironment()

    // App event handlers
    app.whenReady().then(() => this.onAppReady())
    app.on('window-all-closed', this.onWindowAllClosed)
    app.on('activate', this.onActivate)
    app.on('will-quit', this.onWillQuit)
    app.on('web-contents-created', this.onWebContentsCreated)
  }

  private async onAppReady() {
    console.log('App ready, initializing...')
    
    try {
      await this.initializeServices()
      this.createMainWindow()
      this.registerGlobalShortcuts()
      this.setupIpcHandlers()
      
      console.log('[✓] Initialization complete')
    } catch (error) {
      console.error('Failed to initialize app:', error)
      app.quit()
    }
  }

  private async initializeServices(): Promise<void> {
    console.log('Initializing services...')
    
    try {
      // Initialize database service first
      const db = DatabaseService.getInstance()
      await db.initialize()
      console.log('[✓] Database service initialized')
      
      // Initialize auth service
      const auth = AuthService.getInstance()
      await auth.loadUserFromStorage()
      console.log('[✓] Auth service initialized')
      
      // Initialize other services
      const drive = DriveService.getInstance()
      const vector = VectorService.getInstance()
      const calendar = CalendarService.getInstance()
      const maps = MapsService.getInstance()
      const audio = AudioService.getInstance()
      const docs = GoogleDocsService.getInstance()
      
      // Check embedding model
      const hasEmbeddingModel = await vector.checkEmbeddingModel()
      console.log(hasEmbeddingModel ? '[✓] Vector service initialized with embedding model' : '⚠️ Vector service initialized but no embedding model found')
      
      // Initialize organization service with dependencies
      const organization = new OrganizationService(drive, db)
      
      this.services = {
        db,
        auth,
        drive,
        vector,
        organization,
        calendar,
        maps,
        audio,
        docs
      }
      
      console.log('[✓] All services initialized successfully')
    } catch (error) {
      console.error('Failed to initialize services:', error)
      throw error
    }
  }

  private createMainWindow() {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

    this.mainWindow = new BrowserWindow({
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
      show: this.isDev,
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

    // Load content
    if (this.isDev) {
      this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools()
      
      this.mainWindow.webContents.on('console-message', (event, level, message) => {
        if (message.includes('Autofill') || message.includes('SharedImageManager')) {
          event.preventDefault()
        }
      })
    } else {
      this.mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    }

    this.isWindowVisible = this.isDev

    // Window event handlers
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('Window content loaded')
      
      // Set the main window reference in the audio service
      if (this.services?.audio) {
        this.services.audio.setMainWindow(this.mainWindow!)
      }
    })
  }

  private registerGlobalShortcuts() {
    const shortcuts = [
      { key: 'Cmd+Shift+T', action: this.handleTestShortcut, name: 'Test shortcut' },
      { key: process.platform === 'darwin' ? 'Cmd+Space' : 'Ctrl+Space', action: this.toggleWindow, name: 'Toggle window' },
      { key: 'Cmd+Shift+C', action: this.centerWindow, name: 'Center window' },
      { key: 'Cmd+Shift+S', action: this.handleScreenshotShortcut, name: 'Quick screenshot analysis' },
      { key: 'Cmd+Shift+D', action: this.handleDriveModeShortcut, name: 'Toggle drive mode' },
    ]

    try {
      console.log('Attempting to register global shortcuts...')
      
      shortcuts.forEach(({ key, action, name }) => {
        const registered = globalShortcut.register(key, action)
        console.log(`${name} (${key}):`, registered ? 'SUCCESS' : 'FAILED')
      })
      
      console.log('Global shortcuts registered successfully')
    } catch (error) {
      console.error('Error registering shortcuts:', error)
    }
  }

  private setupIpcHandlers() {
    if (!this.services) throw new Error('Services not initialized')

    // Setup all IPC handlers
    setupWindowHandlers(this.mainWindow, this.isWindowVisible)
    setupAuthHandlers(this.services.auth)
    setupDriveHandlers(this.services.drive, this.services.db, this.mainWindow)
    setupOrganizationHandlers(this.services.organization, this.services.auth)
    setupCalendarHandlers(this.services.calendar, this.services.auth, this.services.db)
    setupMapsHandlers(this.services.maps)
    setupAudioHandlers(this.services.audio)
    setupDocsHandlers(this.services.docs, this.services.auth)
    setupScreenCaptureHandlers()
  }

  // Window management methods
  private showWindow = () => {
    if (this.mainWindow && !this.isWindowVisible) {
      this.mainWindow.show()
      this.mainWindow.focus()
      this.isWindowVisible = true
    }
  }

  private hideWindow = () => {
    if (this.mainWindow && this.isWindowVisible) {
      this.mainWindow.hide()
      this.isWindowVisible = false
    }
  }

  private centerWindow = () => {
    if (this.mainWindow) {
      if (!this.mainWindow.isVisible()) {
        this.mainWindow.show()
      }
      
      const primaryDisplay = screen.getPrimaryDisplay()
      const { x: workAreaX, y: workAreaY, width: workAreaWidth } = primaryDisplay.workArea
      const bounds = this.mainWindow.getBounds()
      
      const newX = Math.floor(workAreaX + workAreaWidth / 2 - bounds.width / 2)
      const newY = workAreaY + 20
      
      this.mainWindow.setPosition(newX, newY, true)
      this.mainWindow.focus()
    }
  }

  private toggleWindow = () => {
    console.log('Toggle window, current visibility:', this.isWindowVisible)
    if (this.isWindowVisible) {
      this.hideWindow()
    } else {
      this.showWindow()
    }
  }

  // Shortcut handlers
  private handleTestShortcut = () => {
    console.log('[✓] Test shortcut working')
    if (this.mainWindow) {
      this.mainWindow.webContents.send('shortcut-test-success')
    }
  }

  private handleScreenshotShortcut = async () => {
    console.log('Screenshot shortcut triggered')
    if (this.mainWindow) {
      try {
        const screenshot = await this.captureScreen()
        this.mainWindow.webContents.send('screenshot-captured', screenshot)
      } catch (error) {
        console.error('Error capturing screenshot:', error)
      }
    }
  }

  private handleDriveModeShortcut = () => {
    console.log('🚀 Drive mode shortcut triggered')
    
    if (this.mainWindow?.webContents) {
      console.log('📤 Sending toggle-drive-mode event to renderer')
      
      this.mainWindow.webContents.send('toggle-drive-mode')
      
      if (!this.mainWindow.isVisible()) {
        this.mainWindow.show()
      }
      
      if (!this.mainWindow.isFocused()) {
        this.mainWindow.focus()
      }
      
      if (process.platform === 'darwin') {
        app.focus({ steal: true })
      }
      
      console.log('[✓]Drive mode toggle completed')
    } else {
      console.error('Main window not available')
    }
  }

  // Screen capture functionality
  private async captureScreen(): Promise<string> {
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

  // App event handlers
  private onWindowAllClosed = () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  }

  private onActivate = () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createMainWindow()
    }
  }

  private onWillQuit = () => {
    globalShortcut.unregisterAll()
  }

  private onWebContentsCreated = (event: any, contents: any) => {
    contents.setWindowOpenHandler(({ url }: { url: string }) => {
      return { action: 'deny' }
    })
  }
}

// Initialize the app
new WingmanApp()