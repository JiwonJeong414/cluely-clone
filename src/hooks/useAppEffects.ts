import { useEffect } from 'react'
import { initializeOpenAI } from '../api/openai'
import type { SyncProgress, CalendarRange } from '../types/app'

interface UseAppEffectsProps {
  // State setters
  setAppVersion: (version: string) => void
  setIsInitialized: (initialized: boolean) => void
  setSyncProgress: (progress: SyncProgress | null) => void
  setUser: (user: any) => void
  setGoogleConnection: (connection: any) => void
  setIsLoadingCalendar: (loading: boolean) => void
  setCurrentMode: (mode: any) => void
  setPendingCapture: (capture: any) => void
  
  // State values
  user: any
  googleConnection: any
  currentMode: string
  selectedCalendarRange: CalendarRange
  isLoadingCalendar: boolean
  
  // Functions
  loadCalendarEvents: (range: CalendarRange) => Promise<void>
  refreshSyncStats: () => Promise<void>
  updateDimensions: () => void
}

export function useAppEffects({
  setAppVersion,
  setIsInitialized,
  setSyncProgress,
  setUser,
  setGoogleConnection,
  setIsLoadingCalendar,
  setCurrentMode,
  setPendingCapture,
  user,
  googleConnection,
  currentMode,
  selectedCalendarRange,
  isLoadingCalendar,
  loadCalendarEvents,
  refreshSyncStats,
  updateDimensions
}: UseAppEffectsProps) {
  
  // Initialize app
  useEffect(() => {
    // Initialize OpenAI service
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (apiKey) {
      initializeOpenAI(apiKey)
    }

    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(version => {
        setAppVersion(version)
        setIsInitialized(true)
        setTimeout(updateDimensions, 150)
      })
    } else {
      setIsInitialized(true)
    }

    const initialTimeout = setTimeout(updateDimensions, 200)
    return () => clearTimeout(initialTimeout)
  }, [setAppVersion, setIsInitialized, updateDimensions])

  // Set up sync progress listener ONCE on mount
  useEffect(() => {
    if (window.electronAPI?.onDriveSyncProgress) {
      console.log('Setting up drive sync progress listener')
      window.electronAPI.onDriveSyncProgress((progress: SyncProgress) => {
        console.log('📊 Sync progress update:', progress)
        setSyncProgress(progress)
        
        // Clear progress when sync is complete
        if (progress.isComplete) {
          setTimeout(() => setSyncProgress(null), 3000)
        }
      })
    }
  }, [setSyncProgress])

  // Load user data on startup
  useEffect(() => {
    const loadUserData = async () => {
      if (window.electronAPI?.auth) {
        try {
          const userData = await window.electronAPI.auth.getUser()
          if (userData) {
            setUser(userData)
            
            // Use the consistent API name
            const connection = await window.electronAPI.auth.getGoogleConnection()
            setGoogleConnection(connection)
            
            // Load today's calendar events automatically ONLY if not already loading
            if (connection.isConnected && !isLoadingCalendar) {
              loadCalendarEvents('today')
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      }
    }

    loadUserData()
  }, [setUser, setGoogleConnection, isLoadingCalendar, loadCalendarEvents])

  // Load sync stats when user connects
  useEffect(() => {
    if (user && googleConnection.isConnected) {
      refreshSyncStats()
    }
  }, [user, googleConnection.isConnected, refreshSyncStats])

  // Listen for global screenshot capture
  useEffect(() => {
    if (window.electronAPI?.onScreenshotCaptured) {
      console.log('Setting up screenshot listener')
      window.electronAPI.onScreenshotCaptured((screenshot: string) => {
        console.log('📸 Screenshot received in React!', screenshot.substring(0, 50) + '...')
        // Store the screenshot instead of immediately sending
        setPendingCapture({
          type: 'screenshot',
          data: screenshot,
          timestamp: new Date()
        })
        if (currentMode !== 'chat') setCurrentMode('chat')
      })
    }
  }, [currentMode, setPendingCapture, setCurrentMode])

  // Set up Drive mode toggle listener
  useEffect(() => {
    console.log('Setting up Drive mode toggle listener...')
    
    if (window.electronAPI?.onToggleDriveMode) {
      const handleToggleDriveMode = () => {
        console.log('🎯 Drive mode toggle received from main process')
        setCurrentMode('drive')
        
        // Ensure window is visible and focused
        if (window.electronAPI?.showWindow) {
          window.electronAPI.showWindow()
        }
      }
      
      window.electronAPI.onToggleDriveMode(handleToggleDriveMode)
      console.log('✅ Drive mode toggle listener set up successfully')
      
      return () => {
        console.log('Cleaning up Drive mode toggle listener')
      }
    } else {
      console.log('❌ window.electronAPI?.onToggleDriveMode not available')
    }
  }, [setCurrentMode])

  // Debug: Add this useEffect to log mode changes
  useEffect(() => {
    console.log('🔄 Mode changed to:', currentMode)
    
    // Load calendar events when switching to calendar mode
    if (currentMode === 'calendar' && user && googleConnection.isConnected && !isLoadingCalendar) {
      loadCalendarEvents(selectedCalendarRange)
    }
  }, [currentMode, user, googleConnection.isConnected, selectedCalendarRange, isLoadingCalendar, loadCalendarEvents])
} 