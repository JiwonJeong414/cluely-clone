import { useState, useEffect } from 'react'
import type { User, GoogleConnection, SyncProgress } from '../../electron/preload'

export function useDrive(user: User | null, googleConnection: GoogleConnection) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [syncStats, setSyncStats] = useState<any>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [cleanupCandidates, setCleanupCandidates] = useState<any[]>([])
  const [organizationClusters, setOrganizationClusters] = useState<any[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Set up sync progress listener
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

  const handleSync = async (options: { 
    limit?: number
    force?: boolean
    strategy?: 'new_files_only' | 'force_reindex'
  } = {}) => {
    if (!window.electronAPI?.drive || !user || !googleConnection.isConnected) {
      return
    }
    
    const { limit = 10, force = false, strategy = 'new_files_only' } = options
    
    setIsSyncing(true)
    setSyncProgress(null)
    
    try {
      const result = await window.electronAPI.drive.sync({ limit, force, strategy })
      if (result.success) {
        console.log('✅ Sync completed:', result.result)
        await refreshSyncStats()
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

  // Load sync stats when user connects
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