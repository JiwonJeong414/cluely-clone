import { useState, useCallback } from 'react'
import type { User, GoogleConnection, SyncProgress, CleanupCandidate, OrganizationCluster, Place } from '../../electron/preload'
import { isCalendarQuery, isDriveQuery, isAudioQuery, isLocationQuery } from '../utils/queryHelpers'
import { getCalendarContextForAI } from '../utils/calendarUtils'
import { requestLocationPermission } from '../utils/locationUtils'

export function useDriveHandlers(user: User | null, googleConnection: GoogleConnection) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [cleanupCandidates, setCleanupCandidates] = useState<CleanupCandidate[]>([])
  const [organizationClusters, setOrganizationClusters] = useState<OrganizationCluster[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [syncStats, setSyncStats] = useState<any>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [calendarContext, setCalendarContext] = useState<string>('')

  // Sync logic
  const handleSync = async (options: { limit?: number; force?: boolean; strategy?: 'new_files_only' | 'force_reindex' } = {}) => {
    if (!window.electronAPI?.drive || !user || !googleConnection.isConnected) {
      console.error('Cannot sync: missing requirements', { 
        hasAPI: !!window.electronAPI?.drive, 
        hasUser: !!user, 
        isConnected: googleConnection.isConnected 
      })
      return
    }
    
    const { limit = 10, force = false, strategy = 'new_files_only' } = options
    
    console.log(`🚀 Starting ${strategy} sync with limit ${limit}...`)
    setIsSyncing(true)
    setSyncProgress(null)
    
    try {
      const result = await window.electronAPI.drive.sync({ limit, force, strategy })
      if (result.success) {
        console.log('✅ Sync completed:', result.result)
        
        // Refresh sync stats
        await refreshSyncStats()
        
        // Show success message
        if (result.result?.message) {
          console.log('📊 Sync message:', result.result.message)
        }
      } else {
        console.error('❌ Sync failed:', result.error)
        alert(`Drive sync failed: ${result.error}`)
      }
    } catch (error) {
      console.error('💥 Error syncing:', error)
      alert(`Drive sync error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSyncing(false)
    }
  }
  const handleQuickSync = () => handleSync({ limit: 5, force: false })
  const handleDeepSync = () => handleSync({ limit: 20, force: false })
  const handleForceSync = () => handleSync({ limit: 10, force: true })
  const refreshSyncStats = async () => {
    if (!window.electronAPI?.drive || !user) return
    
    try {
      const result = await window.electronAPI.drive.getSyncStats()
      if (result.success) {
        setSyncStats(result.stats)
      }
    } catch (error) {
      console.error('Error loading sync stats:', error)
    }
  }

  // Cleanup
  const loadCleanupCandidates = async () => {
    if (!window.electronAPI?.db || !user) return
    const result = await window.electronAPI.db.getCleanupCandidates(50)
    if (result.success) setCleanupCandidates(result.candidates || [])
  }
  const handleDeleteFiles = async (fileIds: string[]) => {
    if (!window.electronAPI?.drive || !user) return
    const result = await window.electronAPI.drive.deleteFiles(fileIds)
    if (result.success) setCleanupCandidates(prev => prev.filter(c => !fileIds.includes(c.id)))
  }

  // Organization
  const analyzeForOrganization = async () => {
    if (!window.electronAPI?.drive || !user) return
    setIsAnalyzing(true)
    try {
      const result = await window.electronAPI.drive.analyzeForOrganization({ method: 'hybrid', maxClusters: 6, minClusterSize: 3 })
      if (result.success) setOrganizationClusters(result.analysis?.clusters || [])
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Search Drive documents - FIXED
  const handleDriveSearch = async (query: string, sendMessage: (message: string, screenshot?: string, driveContext?: any[], calendarContext?: string) => Promise<void>, places: Place[], setPlaces: (places: Place[]) => void, userLocation: { lat: number; lng: number } | null, setUserLocation: (location: { lat: number; lng: number } | null) => void, isSearchingMaps: boolean, setIsSearchingMaps: (searching: boolean) => void, lastQueryWasLocation: boolean, setLastQueryWasLocation: (wasLocation: boolean) => void) => {
    const isCalendar = isCalendarQuery(query)
    const isLocation = isLocationQuery(query)
    const isAudio = isAudioQuery(query)
    const isDrive = isDriveQuery(query)

    // Only clear map state if this is NOT a location query
    if (!isLocation) {
      setLastQueryWasLocation(false)
      setPlaces([])
    }

    if (!user || !googleConnection.isConnected) {
      await sendMessage(query)
      return
    }

    // For audio queries, skip drive search and send directly to AI
    if (isAudio) {
      console.log('🎤 Audio query detected, skipping drive search')
      await sendMessage(query)
      return
    }

    try {
      console.log('🔍 Starting integrated search for:', query)
      setLastQueryWasLocation(isLocation)
      let calendarCtx = ''
      let driveResults = null
      let locationResults = null
      
      // Get calendar context if needed
      if (isCalendar && window.electronAPI?.calendar) {
        try {
          calendarCtx = await getCalendarContextForAI(query)
          setCalendarContext(calendarCtx)
        } catch (error) {
          console.warn('Calendar context failed:', error)
        }
      }
      
      // Search maps if location query
      if (isLocation && window.electronAPI?.maps) {
        try {
          setIsSearchingMaps(true)
          
          // Get user location first if we don't have it
          if (!userLocation) {
            const location = await requestLocationPermission()
            if (location) {
              setUserLocation(location)
            }
          }
          
          const mapsResult = await window.electronAPI.maps.search(query)
          if (mapsResult.success && mapsResult.places) {
            locationResults = mapsResult.places
            setPlaces(locationResults)
            console.log(`🗺️ Found ${locationResults.length} places`)
            // Do NOT switch to maps mode; just show map inline in chat
            // If this is PURELY a location query (no calendar context), don't search Drive
            if (!isCalendar) {
              // Build a short location-only context message
              let contextualMessage = "Nearby places:\n"
              if (locationResults && locationResults.length > 0) {
                const locationContext = locationResults
                  .slice(0, 3)
                  .map(place => `${place.name} - ${place.address}`)
                  .join('\n')
                contextualMessage += locationContext
              } else {
                contextualMessage += "No results found."
              }
              contextualMessage += "\n\nPlease answer in 3-4 short sentences."
              await sendMessage(contextualMessage, undefined, undefined, '')
              return // EARLY RETURN - don't search Drive for pure location queries
            }
          }
        } catch (error) {
          console.error('Maps search failed:', error)
        } finally {
          setIsSearchingMaps(false)
        }
      }
      
      // Only search Drive if explicitly requested OR if we have calendar context and user is asking about documents
      if (isDrive || (isCalendar && isDrive)) {
        try {
          console.log('📄 Drive search requested, searching...')
          const driveResult = await window.electronAPI.drive.search(query, 5)
          if (driveResult.success && driveResult.results) {
            driveResults = driveResult.results
            setSearchResults(driveResults)
          }
        } catch (error) {
          console.error('Drive search failed:', error)
          setSearchResults([])
        }
      } else {
        console.log('📄 Drive search not requested, skipping...')
      }
      
      // Build comprehensive context message for calendar + drive queries
      let contextualMessage = query
      
      if (calendarCtx) {
        contextualMessage = `${calendarCtx}\n\nUser question: ${query}`
      }
      
      if (locationResults && locationResults.length > 0) {
        const locationContext = locationResults
          .map(place => `${place.name} - ${place.address} (${place.distance}, ${place.duration}) Rating: ${place.rating}/5`)
          .join('\n')
        
        contextualMessage += `\n\nNearby places:\n${locationContext}`
      }
      
      if (driveResults && driveResults.length > 0) {
        const driveContextText = driveResults
          .map(r => `Document: ${r.fileName}\nContent: ${r.content.substring(0, 300)}...`)
          .join('\n\n')
        
        contextualMessage += `\n\nRelevant documents:\n${driveContextText}`
      }
      
      // Send to AI with all context
      await sendMessage(contextualMessage, undefined, driveResults || undefined, calendarCtx)
    } catch (error) {
      console.error('Error in integrated search:', error)
      await sendMessage(query)
      setLastQueryWasLocation(false)
      setPlaces([])
    }
  }

  return {
    syncProgress,
    setSyncProgress,
    cleanupCandidates,
    setCleanupCandidates,
    organizationClusters,
    setOrganizationClusters,
    isSyncing,
    isAnalyzing,
    syncStats,
    setSyncStats,
    searchResults,
    setSearchResults,
    calendarContext,
    setCalendarContext,
    handleSync,
    handleQuickSync,
    handleDeepSync,
    handleForceSync,
    refreshSyncStats,
    loadCleanupCandidates,
    handleDeleteFiles,
    analyzeForOrganization,
    handleDriveSearch,
  }
} 