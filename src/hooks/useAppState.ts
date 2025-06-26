import { useState, useRef, useEffect } from 'react'
import { useDriveHandlers } from './useDriveHandlers'
import { useCalendarHandlers } from './useCalendarHandlers'
import { useChatHandlers } from './useChatHandlers'
import { isCalendarCreationQuery } from '../utils/queryHelpers'
import { parseCalendarCreationRequest } from '../utils/calendarUtils'
import type { User, GoogleConnection, CalendarEvent, Place } from '../../electron/preload'

export function useAppState() {
  // Core app state
  const [user, setUser] = useState<User | null>(null)
  const [googleConnection, setGoogleConnection] = useState<GoogleConnection>({ isConnected: false })
  const [currentMode, setCurrentMode] = useState<'chat' | 'drive' | 'cleanup' | 'organize' | 'calendar' | 'profile' | 'maps'>('chat')
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Refs
  const contentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize individual hooks
  const driveHandlers = useDriveHandlers(user, googleConnection)
  const calendarHandlers = useCalendarHandlers(user, googleConnection)
  const chatHandlers = useChatHandlers(user, googleConnection)

  // Update dimensions when content changes
  const updateDimensions = () => {
    if (contentRef.current && window.electronAPI?.updateContentDimensions) {
      requestAnimationFrame(() => {
        if (contentRef.current) {
          const rect = contentRef.current.getBoundingClientRect()
          const width = Math.ceil(rect.width)
          const height = Math.ceil(rect.height)
          
          if (width > 0 && height > 0) {
            window.electronAPI.updateContentDimensions({ width, height })
          }
        }
      })
    }
  }

  // Enhanced handleSubmit with calendar creation logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatHandlers.inputValue.trim() || chatHandlers.isLoading || chatHandlers.isStreaming) return
    
    const message = chatHandlers.inputValue.trim()
    chatHandlers.setInputValue('')
    
    // Check if this is a calendar creation request
    const isCalendarCreationRequest = isCalendarCreationQuery(message)
    
    if (isCalendarCreationRequest && user && googleConnection.isConnected) {
      // Parse the request and create the event directly
      const prefillData = parseCalendarCreationRequest(message)
      
      // Set default date and time if not provided
      const now = new Date()
      const defaultDate = now.toISOString().split('T')[0]
      const defaultTime = `${(now.getHours() + 1).toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      
      const eventData = {
        summary: prefillData.summary || 'New Event',
        description: prefillData.description || '',
        startDate: prefillData.startDate || defaultDate,
        startTime: prefillData.startTime || defaultTime,
        endDate: prefillData.endDate || '',
        endTime: prefillData.endTime || '',
        location: prefillData.location || '',
        attendees: prefillData.attendees || ''
      }
      
      // Create the event automatically
      await calendarHandlers.handleCreateEventFromChat(
        eventData, 
        message, 
        chatHandlers.setCurrentResponse, 
        chatHandlers.setStreamingText, 
        chatHandlers.setIsStreaming
      )
      return
    }
    
    // Check if this is a "notes" request with a pending capture
    const isNotesRequest = message.toLowerCase().includes('notes') || message.toLowerCase().includes('save this')
    
    if (isNotesRequest && chatHandlers.pendingCapture) {
      // For notes requests with pending captures, skip drive search
      await chatHandlers.sendMessage(message)
    } else {
      // For all other requests, use the normal drive search flow
      await driveHandlers.handleDriveSearch(
        message,
        chatHandlers.sendMessage,
        chatHandlers.places,
        chatHandlers.setPlaces,
        chatHandlers.userLocation,
        chatHandlers.setUserLocation,
        chatHandlers.isSearchingMaps,
        chatHandlers.setIsSearchingMaps,
        chatHandlers.lastQueryWasLocation,
        chatHandlers.setLastQueryWasLocation
      )
    }
  }

  // Authentication functions
  const handleSignIn = async () => {
    if (!window.electronAPI?.auth) return
    
    setIsAuthenticating(true)
    try {
      const result = await window.electronAPI.auth.signIn()
      if (result.success && result.user) {
        setUser(result.user)
        
        // Use consistent API
        const connection = await window.electronAPI.auth.getGoogleConnection()
        setGoogleConnection(connection)
        
        // Load calendar events after sign in
        if (connection.isConnected) {
          setTimeout(() => calendarHandlers.loadCalendarEvents('today'), 1000) // Slight delay to avoid conflicts
        }
      } else {
        console.error('Sign in failed:', result.error)
      }
    } catch (error) {
      console.error('Error signing in:', error)
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleSignOut = async () => {
    if (!window.electronAPI?.auth) return
    
    try {
      await window.electronAPI.auth.signOut()
      setUser(null)
      setGoogleConnection({ isConnected: false })
      calendarHandlers.setCalendarEvents([])
      driveHandlers.setSyncProgress(null) // Clear any ongoing sync progress
      driveHandlers.setSearchResults([]) // Clear drive search results
      setCurrentMode('chat')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

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
            if (connection.isConnected && !calendarHandlers.isLoadingCalendar) {
              calendarHandlers.loadCalendarEvents('today')
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      }
    }

    loadUserData()
  }, []) // Remove isLoadingCalendar dependency to avoid loops

  // Load sync stats when user connects
  useEffect(() => {
    if (user && googleConnection.isConnected) {
      driveHandlers.refreshSyncStats()
    }
  }, [user, googleConnection.isConnected])

  // Set up sync progress listener ONCE on mount
  useEffect(() => {
    if (window.electronAPI?.onDriveSyncProgress) {
      console.log('Setting up drive sync progress listener')
      window.electronAPI.onDriveSyncProgress((progress: any) => {
        console.log('📊 Sync progress update:', progress)
        driveHandlers.setSyncProgress(progress)
        
        // Clear progress when sync is complete
        if (progress.isComplete) {
          setTimeout(() => driveHandlers.setSyncProgress(null), 3000)
        }
      })
    }
  }, [])

  // Listen for global screenshot capture
  useEffect(() => {
    if (window.electronAPI?.onScreenshotCaptured) {
      console.log('Setting up screenshot listener')
      window.electronAPI.onScreenshotCaptured((screenshot: string) => {
        console.log('📸 Screenshot received in React!', screenshot.substring(0, 50) + '...')
        // Store the screenshot instead of immediately sending
        chatHandlers.setPendingCapture({
          type: 'screenshot',
          data: screenshot,
          timestamp: new Date()
        })
        if (currentMode !== 'chat') setCurrentMode('chat')
      })
    }
  }, [currentMode])

  return {
    // Core app state
    user,
    setUser,
    googleConnection,
    setGoogleConnection,
    currentMode,
    setCurrentMode,
    isAuthenticating,
    setIsAuthenticating,

    // Refs
    contentRef,
    inputRef,

    // Drive handlers
    ...driveHandlers,

    // Calendar handlers
    ...calendarHandlers,

    // Chat handlers
    ...chatHandlers,

    // Authentication
    handleSignIn,
    handleSignOut,

    // Enhanced submit handler
    handleSubmit,

    // Utility functions
    updateDimensions,
  }
} 