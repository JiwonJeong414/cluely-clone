import { useState, useEffect } from 'react'
import type { User, GoogleConnection, SyncProgress, SyncOptions } from '../types/app'

export function useDrive(user: User | null, googleConnection: GoogleConnection) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [syncStats, setSyncStats] = useState<any>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [cleanupCandidates, setCleanupCandidates] = useState<any[]>([])
  const [organizationClusters, setOrganizationClusters] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Sets up sync progress listener from main process
  useEffect(() => {
    if (window.electronAPI?.onDriveSyncProgress) {
      console.log('Setting up drive sync progress listener')
      window.electronAPI.onDriveSyncProgress((progress: SyncProgress) => {
        console.log('📊 Sync progress update:', progress)
        setSyncProgress(progress)
        
        if (progress.isComplete) {
          setTimeout(() => setSyncProgress(null), 3000)
        }
      })
    }
  }, [])

  // Syncs Google Drive files with specified options
  const handleSync = async (options: SyncOptions = {}) => {
    if (!window.electronAPI?.drive || !user || !googleConnection.isConnected) {
      return
    }
    
    const { limit = 10, force = false, strategy = 'new_files_only' } = options
    
    setIsSyncing(true)
    setSyncProgress(null)
    
    try {
      const result = await window.electronAPI.drive.sync({ limit, force, strategy })
      if (result.success) {
        console.log('[✓] Sync completed:', result.result)
        await refreshSyncStats()
      } else {
        console.error('Sync failed:', result.error)
        alert(`Drive sync failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error syncing:', error)
      alert(`Drive sync error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSyncing(false)
    }
  }

  // Quick sync with limited files
  const handleQuickSync = () => handleSync({ limit: 5, force: false })
  
  // Deep sync with more files
  const handleDeepSync = () => handleSync({ limit: 20, force: false })
  
  // Force sync ignoring cache
  const handleForceSync = () => handleSync({ limit: 10, force: true })

  // Refreshes sync statistics
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

  // Loads cleanup candidate files
  const loadCleanupCandidates = async () => {
    if (!window.electronAPI?.db || !user) return
    
    try {
      const result = await window.electronAPI.db.getCleanupCandidates(50)
      if (result.success) {
        setCleanupCandidates(result.candidates || [])
      }
    } catch (error) {
      console.error('Error loading cleanup candidates:', error)
    }
  }

  // Deletes multiple files from Google Drive
  const handleDeleteFiles = async (fileIds: string[]) => {
    if (!window.electronAPI?.drive || !user) return
    
    try {
      const result = await window.electronAPI.drive.deleteFiles(fileIds)
      if (result.success) {
        console.log('Delete completed:', result.summary)
        setCleanupCandidates(prev => 
          prev.filter(candidate => !fileIds.includes(candidate.id))
        )
      }
    } catch (error) {
      console.error('Error deleting files:', error)
    }
  }

  // Analyzes files for organization suggestions
  const analyzeForOrganization = async () => {
    if (!window.electronAPI?.drive || !user) return
    
    setIsAnalyzing(true)
    try {
      const result = await window.electronAPI.drive.analyzeForOrganization({
        method: 'hybrid',
        maxClusters: 6,
        minClusterSize: 3
      })
      
      if (result.success) {
        setOrganizationClusters(result.analysis?.clusters || [])
      }
    } catch (error) {
      console.error('Error analyzing for organization:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Loads sync stats when user connects to Google
  useEffect(() => {
    if (user && googleConnection.isConnected) {
      refreshSyncStats()
    }
  }, [user, googleConnection.isConnected])

  return {
    syncProgress,
    syncStats,
    isSyncing,
    searchResults,
    cleanupCandidates,
    organizationClusters,
    isAnalyzing,
    handleSync,
    handleQuickSync,
    handleDeepSync,
    handleForceSync,
    refreshSyncStats,
    loadCleanupCandidates,
    handleDeleteFiles,
    analyzeForOrganization
  }
}