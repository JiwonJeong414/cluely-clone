// electron/preload.ts - Updated with Drive functionality
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Existing functionality
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  toggleWindow: () => ipcRenderer.invoke('toggle-window'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  updateContentDimensions: (dimensions: { width: number; height: number }) => 
    ipcRenderer.invoke('update-content-dimensions', dimensions),
  dragWindow: (deltaX: number, deltaY: number) => 
    ipcRenderer.invoke('drag-window', deltaX, deltaY),
  centerWindow: () => ipcRenderer.invoke('center-window'),
  
  // Screen capture
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  getAvailableScreens: () => ipcRenderer.invoke('get-available-screens'),
  captureScreenById: (sourceId: string) => ipcRenderer.invoke('capture-screen-by-id', sourceId),
  
  // Event listeners
  onShortcutTestSuccess: (callback: () => void) => {
    ipcRenderer.on('shortcut-test-success', callback)
  },
  onScreenshotCaptured: (callback: (screenshot: string) => void) => {
    ipcRenderer.on('screenshot-captured', (_event, screenshot) => callback(screenshot))
  },
  onToggleDriveMode: (callback: () => void) => {
    ipcRenderer.on('toggle-drive-mode', callback)
  },
  onDriveSyncProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('drive-sync-progress', (_event, progress) => callback(progress))
  },

  // ========== UPDATED AUTHENTICATION APIS ==========
  
  // Authentication - FIXED: Use consistent naming
  auth: {
    getUser: () => ipcRenderer.invoke('auth-get-user'),
    signIn: () => ipcRenderer.invoke('auth-sign-in'),
    signOut: () => ipcRenderer.invoke('auth-sign-out'),
    getGoogleConnection: () => ipcRenderer.invoke('auth-get-google-connection'),
    // Deprecated but kept for backward compatibility
    getDriveConnection: () => ipcRenderer.invoke('auth-get-google-connection'),
  },

  // Drive operations
  drive: {
    sync: (options?: { limit?: number; force?: boolean; strategy?: string }) => ipcRenderer.invoke('drive-sync', options),
    syncForce: (options?: { limit?: number }) => ipcRenderer.invoke('drive-sync-force', options),
    syncNew: (options?: { limit?: number }) => ipcRenderer.invoke('drive-sync-new', options),
    getSyncStats: () => ipcRenderer.invoke('drive-get-sync-stats'),
    search: (query: string, limit?: number) => ipcRenderer.invoke('drive-search', query, limit),
    listFiles: (options?: any) => ipcRenderer.invoke('drive-list-files', options),
    deleteFile: (fileId: string) => ipcRenderer.invoke('drive-delete-file', fileId),
    deleteFiles: (fileIds: string[]) => ipcRenderer.invoke('drive-delete-files', fileIds),
    createFolder: (name: string) => ipcRenderer.invoke('drive-create-folder', name),
    moveFile: (fileId: string, folderId: string) => ipcRenderer.invoke('drive-move-file', fileId, folderId),
    organizeFiles: (plan: any) => ipcRenderer.invoke('drive-organize-files', plan),
    analyzeForOrganization: (options?: any) => ipcRenderer.invoke('drive-analyze-for-organization', options),
  },

  // Database operations
  db: {
    getIndexedFiles: () => ipcRenderer.invoke('db-get-indexed-files'),
    getCleanupCandidates: (maxFiles?: number) => ipcRenderer.invoke('db-get-cleanup-candidates', maxFiles),
  },

  // Calendar operations
  calendar: {
    getEvents: (timeRange?: { start?: string, end?: string }) => 
      ipcRenderer.invoke('calendar-get-events', timeRange),
    getToday: () => ipcRenderer.invoke('calendar-get-today'),
    getWeek: () => ipcRenderer.invoke('calendar-get-week'),
    getNextWeek: () => ipcRenderer.invoke('calendar-get-next-week'),
    analyze: (query: string) => ipcRenderer.invoke('calendar-analyze', query),
    getContext: (query: string) => ipcRenderer.invoke('calendar-get-context', query),
  },

  // Maps operations
  maps: {
    search: (query: string, options?: any) => ipcRenderer.invoke('maps-search', query, options),
    getLocation: () => ipcRenderer.invoke('maps-get-location'),
    getPlaceDetails: (placeId: string) => ipcRenderer.invoke('maps-get-place-details', placeId),
    getTravelTime: (origin: any, destination: any, mode?: 'driving' | 'walking' | 'transit') => 
      ipcRenderer.invoke('maps-get-travel-time', origin, destination, mode),
  },

  // Debug operations
  debug: {
    apiKey: () => Promise<{
      mainProcess: {
        googleMapsKey: boolean
        viteKey: boolean
        googlePreview?: string
        vitePreview?: string
        nodeEnv?: string
        allEnvKeys: string[]
      }
    }>
  },
})

// Type definitions
export interface User {
  id: string
  uid: string
  email: string
  displayName: string
  photoURL?: string
}

// FIXED: Use consistent naming - GoogleConnection instead of DriveConnection
export interface GoogleConnection {
  isConnected: boolean
  accessToken?: string
  refreshToken?: string
  connectedAt?: Date
  lastDriveSyncAt?: Date
  lastCalendarSyncAt?: Date
}

// Keep DriveConnection as alias for backward compatibility
export interface DriveConnection extends GoogleConnection {}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size?: string
  webViewLink?: string
  ownedByMe?: boolean
}

export interface SyncProgress {
  totalFiles: number
  processedFiles: number
  currentFile: string
  embeddingsCreated: number
  skipped: number
  errors: number
  isComplete: boolean
}

export interface CleanupCandidate {
  id: string
  name: string
  mimeType: string
  size: number
  modifiedTime: string
  webViewLink?: string
  category: 'tiny' | 'small' | 'empty' | 'duplicate' | 'system' | 'old'
  reason: string
  confidence: 'low' | 'medium' | 'high'
  selected: boolean
}

export interface OrganizationCluster {
  id: string
  name: string
  description: string
  color: string
  suggestedFolderName: string
  category: 'work' | 'personal' | 'media' | 'documents' | 'archive' | 'mixed'
  files: Array<{
    fileId: string
    fileName: string
    confidence: number
    keywords: string[]
  }>
}

export interface ScreenSource {
  id: string
  name: string
  thumbnail: string
  display_id: string
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  }>
  status: 'confirmed' | 'tentative' | 'cancelled'
  creator?: {
    email: string
    displayName?: string
  }
  organizer?: {
    email: string
    displayName?: string
  }
  htmlLink?: string
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string
      uri: string
      label?: string
    }>
  }
}

export interface CalendarInsight {
  type: 'upcoming_busy_period' | 'free_time' | 'travel_time' | 'meeting_prep' | 'conflict'
  message: string
  events: CalendarEvent[]
  priority: 'low' | 'medium' | 'high'
  actionable?: boolean
}

export interface CalendarAnalysis {
  events: CalendarEvent[]
  insights: CalendarInsight[]
  summary: string
}

export interface Place {
  placeId: string
  name: string
  address: string
  rating?: number
  priceLevel?: number
  types: string[]
  location: { lat: number; lng: number }
  phoneNumber?: string
  website?: string
  openingHours?: string[]
  distance?: string
  duration?: string
}

export interface ElectronAPI {
  // Existing
  getAppVersion: () => Promise<string>
  toggleWindow: () => Promise<void>
  hideWindow: () => Promise<void>
  showWindow: () => Promise<void>
  updateContentDimensions: (dimensions: { width: number; height: number }) => Promise<void>
  dragWindow: (deltaX: number, deltaY: number) => Promise<void>
  captureScreen: () => Promise<string>
  getAvailableScreens: () => Promise<ScreenSource[]>
  captureScreenById: (sourceId: string) => Promise<string>
  onShortcutTestSuccess: (callback: () => void) => void
  onScreenshotCaptured: (callback: (screenshot: string) => void) => void
  onToggleDriveMode: (callback: () => void) => void
  onDriveSyncProgress: (callback: (progress: SyncProgress) => void) => void

  // Authentication - FIXED: Consistent naming
  auth: {
    getUser: () => Promise<User | null>
    signIn: () => Promise<{ success: boolean; user?: User; error?: string }>
    signOut: () => Promise<{ success: boolean; error?: string }>
    getGoogleConnection: () => Promise<GoogleConnection>
    // Backward compatibility
    getDriveConnection: () => Promise<GoogleConnection>
  }

  // Drive
  drive: {
    sync: (options?: { limit?: number; force?: boolean; strategy?: string }) => Promise<{ success: boolean; result?: any; error?: string }>
    syncForce: (options?: { limit?: number }) => Promise<{ success: boolean; result?: any; error?: string }>
    syncNew: (options?: { limit?: number }) => Promise<{ success: boolean; result?: any; error?: string }>
    getSyncStats: () => Promise<{ success: boolean; stats?: any; error?: string }>
    search: (query: string, limit?: number) => Promise<{ success: boolean; results?: any[]; error?: string }>
    listFiles: (options?: any) => Promise<{ success: boolean; files?: DriveFile[]; error?: string }>
    deleteFile: (fileId: string) => Promise<{ success: boolean; error?: string }>
    deleteFiles: (fileIds: string[]) => Promise<{ success: boolean; results?: any[]; summary?: any; error?: string }>
    createFolder: (name: string) => Promise<{ success: boolean; folderId?: string; error?: string }>
    moveFile: (fileId: string, folderId: string) => Promise<{ success: boolean; error?: string }>
    organizeFiles: (plan: any) => Promise<{ success: boolean; result?: any; error?: string }>
    analyzeForOrganization: (options?: any) => Promise<{ success: boolean; analysis?: any; error?: string }>
  }

  // Database
  db: {
    getIndexedFiles: () => Promise<{ success: boolean; files?: any[]; error?: string }>
    getCleanupCandidates: (maxFiles?: number) => Promise<{ success: boolean; candidates?: CleanupCandidate[]; error?: string }>
  }

  // Calendar
  calendar: {
    getEvents: (timeRange?: { start?: string, end?: string }) => 
      Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }>
    getToday: () => Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }>
    getWeek: () => Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }>
    getNextWeek: () => Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }>
    analyze: (query: string) => Promise<{ success: boolean; analysis?: CalendarAnalysis; error?: string }>
    getContext: (query: string) => Promise<{ success: boolean; context?: string; error?: string }>
  }

  // Maps
  maps: {
    search: (query: string, options?: any) => Promise<{ success: boolean; places?: Place[]; error?: string }>
    getLocation: () => Promise<{ success: boolean; location?: { lat: number; lng: number }; error?: string }>
    getPlaceDetails: (placeId: string) => Promise<{ success: boolean; place?: Place; error?: string }>
    getTravelTime: (origin: any, destination: any, mode?: 'driving' | 'walking' | 'transit') => Promise<{ success: boolean; travelInfo?: { distance: string; duration: string }; error?: string }>
  }

  // Debug operations
  debug: {
    apiKey: () => Promise<{
      mainProcess: {
        googleMapsKey: boolean
        viteKey: boolean
        googlePreview?: string
        vitePreview?: string
        nodeEnv?: string
        allEnvKeys: string[]
      }
    }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}