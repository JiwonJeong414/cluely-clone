import { useCallback } from 'react'
import type { User, GoogleConnection, CleanupCandidate, OrganizationCluster } from '../types/app'

interface UseDriveOperationsProps {
  user: User | null
  googleConnection: GoogleConnection
  setCleanupCandidates: (candidates: CleanupCandidate[] | ((prev: CleanupCandidate[]) => CleanupCandidate[])) => void
  setOrganizationClusters: (clusters: OrganizationCluster[]) => void
  setIsSyncing: (syncing: boolean) => void
  setIsAnalyzing: (analyzing: boolean) => void
  refreshSyncStats: () => Promise<void>
}

export function useDriveOperations({
  user,
  googleConnection,
  setCleanupCandidates,
  setOrganizationClusters,
  setIsSyncing,
  setIsAnalyzing,
  refreshSyncStats
}: UseDriveOperationsProps) {
  
  // Enhanced sync function with options
  const handleSync = useCallback(async (options: { 
    limit?: number
    force?: boolean
    strategy?: 'new_files_only' | 'force_reindex'
  } = {}) => {
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
  }, [user, googleConnection.isConnected, setIsSyncing, refreshSyncStats])

  // Quick sync methods
  const handleQuickSync = useCallback(() => handleSync({ limit: 5, force: false }), [handleSync])
  const handleDeepSync = useCallback(() => handleSync({ limit: 20, force: false }), [handleSync])
  const handleForceSync = useCallback(() => handleSync({ limit: 10, force: true }), [handleSync])

  // Load cleanup candidates
  const loadCleanupCandidates = useCallback(async () => {
    if (!window.electronAPI?.db || !user) return
    
    try {
      const result = await window.electronAPI.db.getCleanupCandidates(50)
      if (result.success) {
        setCleanupCandidates(result.candidates || [])
      }
    } catch (error) {
      console.error('Error loading cleanup candidates:', error)
    }
  }, [user, setCleanupCandidates])

  // Delete files
  const handleDeleteFiles = useCallback(async (fileIds: string[]) => {
    if (!window.electronAPI?.drive || !user) return
    
    try {
      const result = await window.electronAPI.drive.deleteFiles(fileIds)
      if (result.success) {
        console.log('Delete completed:', result.summary)
        
        // Remove deleted files from candidates
        setCleanupCandidates((prev: CleanupCandidate[]) => 
          prev.filter((candidate: CleanupCandidate) => !fileIds.includes(candidate.id))
        )
      }
    } catch (error) {
      console.error('Error deleting files:', error)
    }
  }, [user, setCleanupCandidates])

  // Analyze for organization
  const analyzeForOrganization = useCallback(async () => {
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
  }, [user, setIsAnalyzing, setOrganizationClusters])

  return {
    handleSync,
    handleQuickSync,
    handleDeepSync,
    handleForceSync,
    loadCleanupCandidates,
    handleDeleteFiles,
    analyzeForOrganization
  }
} 