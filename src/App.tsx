import React, { useEffect, useState, useRef, useCallback } from 'react'
import { initializeOpenAI, getOpenAI, type ChatMessage } from './api/openai'
import type { User, DriveConnection, SyncProgress, CleanupCandidate, DriveFile, OrganizationCluster } from '../electron/preload'

// Extend CSS properties to include webkit-specific properties
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  hasScreenshot?: boolean
  screenshotUrl?: string
  driveContext?: any[]
}

type AppMode = 'chat' | 'drive' | 'cleanup' | 'organize'

function App() {
  // Existing state
  const [appVersion, setAppVersion] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [currentResponse, setCurrentResponse] = useState<Message | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // New Drive state
  const [currentMode, setCurrentMode] = useState<AppMode>('chat')
  const [user, setUser] = useState<User | null>(null)
  const [driveConnection, setDriveConnection] = useState<DriveConnection>({ isConnected: false })
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  const [cleanupCandidates, setCleanupCandidates] = useState<CleanupCandidate[]>([])
  const [organizationClusters, setOrganizationClusters] = useState<OrganizationCluster[]>([])
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  
  const contentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load user data on startup
  useEffect(() => {
    const loadUserData = async () => {
      if (window.electronAPI?.auth) {
        try {
          const userData = await window.electronAPI.auth.getUser()
          if (userData) {
            setUser(userData)
            
            const connection = await window.electronAPI.auth.getDriveConnection()
            setDriveConnection(connection)
          }
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      }
    }

    loadUserData()
  }, [])

  // Update dimensions when content changes
  const updateDimensions = useCallback(() => {
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
  }, [])

  // Authentication functions
  const handleSignIn = async () => {
    if (!window.electronAPI?.auth) return
    
    setIsAuthenticating(true)
    try {
      const result = await window.electronAPI.auth.signIn()
      if (result.success && result.user) {
        setUser(result.user)
        
        // Refresh drive connection
        const connection = await window.electronAPI.auth.getDriveConnection()
        setDriveConnection(connection)
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
      setDriveConnection({ isConnected: false })
      setCurrentMode('chat')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Drive sync function
  const handleSync = async () => {
    if (!window.electronAPI?.drive || !user) return
    
    setIsSyncing(true)
    setSyncProgress(null)
    
    try {
      const result = await window.electronAPI.drive.sync({ limit: 10 })
      if (result.success) {
        console.log('Sync completed:', result.result)
        
        // Refresh indexed files
        const filesResult = await window.electronAPI.db.getIndexedFiles()
        if (filesResult.success) {
          // Convert to DriveFile format if needed
        }
      } else {
        console.error('Sync failed:', result.error)
      }
    } catch (error) {
      console.error('Error syncing:', error)
    } finally {
      setIsSyncing(false)
      setSyncProgress(null)
    }
  }

  // Search Drive documents
  const handleDriveSearch = async (query: string) => {
    if (!window.electronAPI?.drive || !user) return
    
    try {
      const result = await window.electronAPI.drive.search(query, 5)
      if (result.success) {
        setSearchResults(result.results || [])
        
        // Add Drive context to chat if we have results
        if (result.results && result.results.length > 0) {
          const driveContextMessage = `Based on your Google Drive documents:\n\n${result.results
            .map(r => `📄 ${r.fileName}: ${r.content.substring(0, 100)}...`)
            .join('\n\n')}\n\nUser question: ${query}`
          
          await sendMessage(driveContextMessage, undefined, result.results)
        }
      }
    } catch (error) {
      console.error('Error searching Drive:', error)
    }
  }

  // Load cleanup candidates
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

  // Delete files
  const handleDeleteFiles = async (fileIds: string[]) => {
    if (!window.electronAPI?.drive || !user) return
    
    try {
      const result = await window.electronAPI.drive.deleteFiles(fileIds)
      if (result.success) {
        console.log('Delete completed:', result.summary)
        
        // Remove deleted files from candidates
        setCleanupCandidates(prev => 
          prev.filter(candidate => !fileIds.includes(candidate.id))
        )
      }
    } catch (error) {
      console.error('Error deleting files:', error)
    }
  }

  // Analyze for organization
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

  // Send message with Drive context
  const sendMessage = async (userMessage: string, screenshotDataUrl?: string, driveContext?: any[]) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      hasScreenshot: !!screenshotDataUrl,
      screenshotUrl: screenshotDataUrl,
      driveContext
    }

    setCurrentResponse(null)
    setStreamingText('')
    setIsLoading(true)
    setIsStreaming(true)
    setInputValue('')

    try {
      const openai = getOpenAI()
      
      // Build context-aware message
      let contextualContent = userMessage
      if (driveContext && driveContext.length > 0) {
        const driveContextText = driveContext
          .map(ctx => `Document: ${ctx.fileName}\nContent: ${ctx.content.substring(0, 500)}...`)
          .join('\n\n')
        
        contextualContent = `Based on the following documents from Google Drive:\n\n${driveContextText}\n\nUser question: ${userMessage}`
      }
      
      if (screenshotDataUrl) {
        // Use vision API
        let fullResponse = ''
        await openai.analyzeScreenshotStream(
          screenshotDataUrl,
          (chunk: string) => {
            fullResponse += chunk
            setStreamingText(fullResponse)
            requestAnimationFrame(() => updateDimensions())
          },
          contextualContent
        )
        
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date(),
          driveContext
        }

        setCurrentResponse(assistantMsg)
      } else {
        // Regular text chat
        const chatMessages: ChatMessage[] = [
          {
            role: 'system',
            content: 'You are Wingman, a helpful AI assistant with access to Google Drive documents. When provided with Drive context, use it to give more relevant and specific answers.'
          },
          {
            role: 'user',
            content: contextualContent
          }
        ]
        
        let fullResponse = ''
        await openai.sendMessageStream(chatMessages, (chunk: string) => {
          fullResponse += chunk
          setStreamingText(fullResponse)
          requestAnimationFrame(() => updateDimensions())
        })
        
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date(),
          driveContext
        }

        setCurrentResponse(assistantMsg)
      }
      
      setStreamingText('')
      setIsStreaming(false)
      
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setCurrentResponse(errorMsg)
      setStreamingText('')
      setIsStreaming(false)
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        inputRef.current?.focus()
        updateDimensions()
      }, 200)
    }
  }

  // Handle input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = inputValue.trim()
    if (!query || isLoading || isStreaming) return

    // If we have Drive connection, search Drive first
    if (driveConnection.isConnected && currentMode === 'chat') {
      await handleDriveSearch(query)
    } else {
      await sendMessage(query)
    }
  }

  // Listen for Drive mode toggle
  useEffect(() => {
    if (window.electronAPI?.onToggleDriveMode) {
      window.electronAPI.onToggleDriveMode(() => {
        setCurrentMode(prev => prev === 'drive' ? 'chat' : 'drive')
      })
    }

    if (window.electronAPI?.onDriveSyncProgress) {
      window.electronAPI.onDriveSyncProgress((progress) => {
        setSyncProgress(progress)
      })
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+D for Drive mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setCurrentMode(prev => prev === 'drive' ? 'chat' : 'drive')
      }
      
      // Cmd+Enter to toggle between modes
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (user && driveConnection.isConnected) {
          setCurrentMode(prev => {
            const modes: AppMode[] = ['chat', 'drive', 'cleanup', 'organize']
            const currentIndex = modes.indexOf(prev)
            return modes[(currentIndex + 1) % modes.length]
          })
        }
      }
      
      // Escape to return to chat
      if (e.key === 'Escape') {
        setCurrentMode('chat')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [user, driveConnection])

  // Render mode content
  const renderModeContent = () => {
    if (!user) {
      return (
        <div className="p-6 text-center">
          <h3 className="text-white text-lg mb-4">Sign in to access Drive features</h3>
          <button
            onClick={handleSignIn}
            disabled={isAuthenticating}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {isAuthenticating ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      )
    }

    switch (currentMode) {
      case 'drive':
        return (
          <div className="p-4" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Drive Management</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded text-sm text-white transition-colors"
                  >
                    {isSyncing ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
              </div>
              
              {syncProgress && (
                <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
                  <div className="text-white/80 text-sm mb-2">
                    Processing: {syncProgress.currentFile}
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(syncProgress.processedFiles / syncProgress.totalFiles) * 100}%` }}
                    />
                  </div>
                  <div className="text-white/60 text-xs mt-1">
                    {syncProgress.processedFiles}/{syncProgress.totalFiles} files • {syncProgress.embeddingsCreated} indexed
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCurrentMode('cleanup')}
                  className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 rounded-lg text-white/80 text-sm transition-colors"
                >
                  🗑️ Cleanup
                </button>
                <button
                  onClick={() => setCurrentMode('organize')}
                  className="p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-400/30 rounded-lg text-white/80 text-sm transition-colors"
                >
                  📁 Organize
                </button>
              </div>
            </div>
          </div>
        )

      case 'cleanup':
        return (
          <div className="p-4" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Drive Cleanup</h3>
                <button
                  onClick={loadCleanupCandidates}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded text-sm text-white transition-colors"
                >
                  Scan
                </button>
              </div>
              
              {cleanupCandidates.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cleanupCandidates.slice(0, 10).map((candidate) => (
                    <div
                      key={candidate.id}
                      className="bg-red-500/10 border border-red-400/20 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-white/90 text-sm font-medium truncate">
                            {candidate.name}
                          </div>
                          <div className="text-red-300 text-xs mt-1">
                            {candidate.reason} • {candidate.confidence} confidence
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFiles([candidate.id])}
                          className="ml-2 px-2 py-1 bg-red-500/30 hover:bg-red-500/50 rounded text-xs text-white transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {cleanupCandidates.length > 10 && (
                    <div className="text-center">
                      <button
                        onClick={() => {
                          const selectedIds = cleanupCandidates
                            .filter(c => c.confidence === 'high')
                            .map(c => c.id)
                          handleDeleteFiles(selectedIds)
                        }}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded text-sm text-white transition-colors"
                      >
                        Delete All High Confidence ({cleanupCandidates.filter(c => c.confidence === 'high').length})
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {cleanupCandidates.length === 0 && (
                <div className="text-center text-white/60 py-8">
                  No cleanup candidates found.<br />
                  Click "Scan" to analyze your Drive.
                </div>
              )}
            </div>
          </div>
        )

      case 'organize':
        return (
          <div className="p-4" style={{ WebkitAppRegion: 'no-drag' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">File Organization</h3>
                <button
                  onClick={analyzeForOrganization}
                  disabled={isAnalyzing}
                  className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded text-sm text-white transition-colors"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
              
              {organizationClusters.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {organizationClusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="bg-green-500/10 border border-green-400/20 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-white/90 text-sm font-medium">
                            {cluster.name}
                          </div>
                          <div className="text-green-300 text-xs mt-1">
                            {cluster.files.length} files • {cluster.category}
                          </div>
                          <div className="text-white/60 text-xs mt-1">
                            → {cluster.suggestedFolderName}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const result = await window.electronAPI.drive.organizeFiles({
                                clusters: [cluster]
                              })
                              if (result.success) {
                                console.log('Organization completed for cluster:', cluster.name)
                              }
                            } catch (error) {
                              console.error('Error organizing cluster:', error)
                            }
                          }}
                          className="ml-2 px-2 py-1 bg-green-500/30 hover:bg-green-500/50 rounded text-xs text-white transition-colors"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-center">
                    <button
                      onClick={async () => {
                        try {
                          const result = await window.electronAPI.drive.organizeFiles({
                            clusters: organizationClusters
                          })
                          if (result.success) {
                            console.log('Organization completed for all clusters')
                            setOrganizationClusters([])
                          }
                        } catch (error) {
                          console.error('Error organizing all clusters:', error)
                        }
                      }}
                      className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded text-sm text-white transition-colors"
                    >
                      Organize All ({organizationClusters.length} folders)
                    </button>
                  </div>
                </div>
              )}
              
              {organizationClusters.length === 0 && !isAnalyzing && (
                <div className="text-center text-white/60 py-8">
                  No organization suggestions.<br />
                  Click "Analyze" to get smart folder suggestions.
                </div>
              )}
            </div>
          </div>
        )

      default: // chat mode
        return null
    }
  }

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
  }, [updateDimensions])

  // Drag handlers (simplified for brevity)
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || 
        target.closest('button') || target.closest('input')) {
      return
    }
    
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  return (
    <div 
      ref={contentRef}
      className={`bg-black/85 backdrop-blur-lg rounded-xl border border-blue-500/20 shadow-lg relative overflow-hidden transition-all duration-300 ${
        isDragging ? 'scale-105 shadow-xl' : ''
      } ${!isInitialized ? 'opacity-0' : 'opacity-100'}`}
      style={{ 
        width: 'fit-content', 
        height: 'fit-content',
        minWidth: currentMode === 'chat' ? '480px' : '500px',
        maxWidth: '700px',
        transformOrigin: 'center center'
      }}
    >
      {/* Header */}
      <div 
        className={`px-4 py-3 bg-black/95 backdrop-blur-lg cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-2.5 h-2.5 rounded-full ${
                isSyncing ? 'bg-orange-400' : 
                isStreaming ? 'bg-blue-400' : 
                'bg-green-400'
              } animate-pulse`}></div>
            </div>
            
            <div>
              <h1 className="text-white font-medium text-sm">
                Wingman {user && driveConnection.isConnected && `• ${currentMode}`}
              </h1>
              <p className="text-white/50 text-xs">
                {user ? `${user.displayName} • ${driveConnection.isConnected ? 'Drive Connected' : 'Drive Disconnected'}` : 'Not signed in'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
            {user && (
              <>
                <button
                  onClick={() => setCurrentMode('drive')}
                  className={`p-2 border rounded-lg text-sm transition-colors ${
                    currentMode === 'drive' 
                      ? 'bg-blue-500/30 border-blue-400/50' 
                      : 'bg-blue-500/10 border-blue-400/20 hover:bg-blue-500/20'
                  }`}
                  title="Drive mode (⌘⇧D)"
                >
                  💾
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-lg text-sm transition-colors"
                  title="Sign out"
                >
                  👤
                </button>
              </>
            )}
          </div>
        </div>

        {/* Chat Input */}
        {currentMode === 'chat' && (
          <div className="relative" style={{ WebkitAppRegion: 'no-drag' }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit(e))}
              placeholder={driveConnection.isConnected ? "Ask about your Drive..." : "Type a message..."}
              className="w-full bg-blue-500/10 border border-blue-400/20 rounded-lg px-4 py-3 pr-20 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-colors text-sm"
              disabled={isLoading || isStreaming}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isLoading || isStreaming}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs transition-colors"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        )}

        {/* Mode shortcuts */}
        <div className="mt-2 text-center">
          <span className="text-white/30 text-xs">
            {user ? '⌘↵ Switch • ⌘⇧D Drive • ⎋ Chat' : '⌘⇧S Screenshot • ⎋ Close'}
          </span>
        </div>
      </div>

      {/* Mode Content */}
      {currentMode !== 'chat' && renderModeContent()}

      {/* Chat Messages */}
      {currentMode === 'chat' && (streamingText || isStreaming || currentResponse) && (
        <div className="px-6 py-4 bg-black/20 border-t border-blue-500/10 max-h-96 overflow-y-auto custom-scrollbar">
          {(streamingText || isStreaming) && (
            <div className="bg-blue-500/5 border border-blue-400/10 rounded-lg px-6 py-4">
              <div className="text-sm leading-relaxed space-y-3 text-white/90">
                {streamingText || (
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                    </div>
                    <span className="text-blue-300 text-sm font-medium">
                      {driveConnection.isConnected ? 'Searching Drive & analyzing...' : 'Analyzing...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {currentResponse && !isStreaming && (
            <div className="bg-blue-500/5 border border-blue-400/10 rounded-lg px-6 py-4">
              <div className="text-sm leading-relaxed space-y-3 text-white/90">
                {currentResponse.content}
              </div>
              
              {/* Show Drive context if available */}
              {currentResponse.driveContext && currentResponse.driveContext.length > 0 && (
                <div className="mt-4 pt-3 border-t border-blue-400/10">
                  <div className="text-xs text-blue-300 mb-2">📄 Referenced Documents:</div>
                  <div className="space-y-1">
                    {currentResponse.driveContext.map((doc, idx) => (
                      <div key={idx} className="text-xs text-white/60 truncate">
                        • {doc.fileName}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Welcome content for chat mode */}
      {currentMode === 'chat' && !currentResponse && !streamingText && !isStreaming && (
        <div className="p-5 bg-black/30">
          <div className="text-center">
            <h2 className="text-white text-lg mb-2">
              {user ? `Welcome back, ${user.displayName?.split(' ')[0]}!` : 'Ready to help'}
            </h2>
            <p className="text-white/50 text-sm mb-4">
              {driveConnection.isConnected 
                ? 'I can search your Drive and answer questions about your documents'
                : 'Type above, press ⌘⇧S to capture screen, or sign in for Drive access'
              }
            </p>
            
            {appVersion && (
              <div className="pt-3 border-t border-blue-500/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/30">v{appVersion}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span className="text-white/30">
                      {driveConnection.isConnected ? 'Drive + Vision Ready' : 'Vision Ready'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App