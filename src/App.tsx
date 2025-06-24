import React, { useEffect, useState, useRef, useCallback } from 'react'
import { initializeOpenAI, getOpenAI, type ChatMessage } from './api/openai'

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
}

interface ScreenSource {
  id: string
  name: string
  thumbnail: string
  display_id: string
}

function App() {
  const [appVersion, setAppVersion] = useState<string>('')
  const [shortcutTestSuccess, setShortcutTestSuccess] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isChatMode, setIsChatMode] = useState(false)
  const [currentResponse, setCurrentResponse] = useState<Message | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [availableScreens, setAvailableScreens] = useState<ScreenSource[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [showScreenOptions, setShowScreenOptions] = useState(false)
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  
  const contentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

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

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      })
    }
  }, [])

  // Format response text with bold sections and lists
  const formatResponse = (text: string) => {
    // Split by double asterisks for bold sections
    const parts = text.split(/(\*\*.*?\*\*)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <span key={index} className="font-semibold text-blue-200">
            {part.slice(2, -2)}
          </span>
        )
      }
      
      // Handle numbered lists
      if (part.includes('\n') && /^\d+\./.test(part.trim())) {
        const lines = part.split('\n').filter(line => line.trim())
        return (
          <div key={index} className="space-y-2">
            {lines.map((line, lineIndex) => {
              if (/^\d+\./.test(line.trim())) {
                return (
                  <div key={lineIndex} className="flex gap-3">
                    <span className="text-blue-300 font-medium text-sm mt-0.5 flex-shrink-0">
                      {line.match(/^\d+/)?.[0]}.
                    </span>
                    <span className="text-white/90 leading-relaxed">
                      {line.replace(/^\d+\.\s*/, '')}
                    </span>
                  </div>
                )
              }
              return (
                <p key={lineIndex} className="text-white/90 leading-relaxed">
                  {line}
                </p>
              )
            })}
          </div>
        )
      }
      
      return (
        <span key={index} className="text-white/90 leading-relaxed">
          {part}
        </span>
      )
    })
  }

  // Copy to clipboard functionality
  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Load available screens
  const loadAvailableScreens = useCallback(async () => {
    if (window.electronAPI?.getAvailableScreens) {
      try {
        const screens = await window.electronAPI.getAvailableScreens()
        setAvailableScreens(screens)
      } catch (error) {
        console.error('Error loading available screens:', error)
      }
    }
  }, [])

  // Capture primary screen
  const captureScreen = useCallback(async () => {
    if (!window.electronAPI?.captureScreen) return null
    
    setIsCapturing(true)
    try {
      const screenshot = await window.electronAPI.captureScreen()
      setLastScreenshot(screenshot)
      return screenshot
    } catch (error) {
      console.error('Error capturing screen:', error)
      return null
    } finally {
      setIsCapturing(false)
    }
  }, [])

  // Capture specific screen by ID
  const captureScreenById = useCallback(async (sourceId: string) => {
    if (!window.electronAPI?.captureScreenById) return null
    
    setIsCapturing(true)
    try {
      const screenshot = await window.electronAPI.captureScreenById(sourceId)
      setLastScreenshot(screenshot)
      return screenshot
    } catch (error) {
      console.error('Error capturing screen by ID:', error)
      return null
    } finally {
      setIsCapturing(false)
    }
  }, [])

  // Send message to OpenAI with optional screenshot
  const sendMessage = async (userMessage: string, screenshotDataUrl?: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      hasScreenshot: !!screenshotDataUrl,
      screenshotUrl: screenshotDataUrl
    }

    setCurrentResponse(null)
    setStreamingText('')
    setIsLoading(true)
    setIsStreaming(true)
    setInputValue('')

    try {
      console.log('Sending message with screenshot to OpenAI Vision API...')
      const openai = getOpenAI()
      
      if (screenshotDataUrl) {
        // Use vision API for screenshot analysis
        let fullResponse = ''
        await openai.analyzeScreenshotStream(
          screenshotDataUrl,
          (chunk: string) => {
            console.log('Received chunk:', chunk)
            fullResponse += chunk
            setStreamingText(fullResponse)
            requestAnimationFrame(() => {
              updateDimensions()
            })
          },
          userMessage
        )
        
        console.log('Full response received:', fullResponse)
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date()
        }

        setCurrentResponse(assistantMsg)
      } else {
        console.log('Sending regular text message...')
        // Regular text chat
        const contextMessages: Message[] = currentResponse ? [currentResponse, userMsg] : [userMsg]
        const chatMessages: ChatMessage[] = [
          {
            role: 'system',
            content: 'You are Wingman, a helpful AI assistant integrated into a desktop app. Keep responses concise and helpful.'
          },
          ...contextMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }))
        ]
        
        let fullResponse = ''
        await openai.sendMessageStream(chatMessages, (chunk: string) => {
          fullResponse += chunk
          setStreamingText(fullResponse)
          requestAnimationFrame(() => {
            updateDimensions()
          })
        })
        
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date()
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
        content: error instanceof Error 
          ? `Error: ${error.message}. Please check your OpenAI API key and make sure you have access to GPT-4 Vision.` 
          : 'Sorry, I encountered an error. Please check your API key and try again.',
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

  // Handle screenshot capture and analysis
  const handleScreenshotAndAnalyze = async (question?: string) => {
    const screenshot = await captureScreen()
    if (screenshot) {
      const message = question || "What do you see on my screen?"
      await sendMessage(message, screenshot)
      if (!isChatMode) setIsChatMode(true)
    }
  }

  // Handle specific screen capture
  const handleScreenCapture = async (sourceId: string, question?: string) => {
    const screenshot = await captureScreenById(sourceId)
    if (screenshot) {
      const message = question || "What do you see on this screen?"
      await sendMessage(message, screenshot)
      if (!isChatMode) setIsChatMode(true)
      setShowScreenOptions(false)
    }
  }

  // Auto-scroll and resize when response or streaming changes
  useEffect(() => {
    if (isChatMode && (currentResponse || isStreaming || streamingText)) {
      requestAnimationFrame(() => {
        scrollToBottom()
        updateDimensions()
      })
    }
  }, [currentResponse, isStreaming, streamingText, isChatMode, scrollToBottom, updateDimensions])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter to toggle chat mode
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        const newChatMode = !isChatMode
        setIsChatMode(newChatMode)
        if (newChatMode) {
          setTimeout(() => {
            inputRef.current?.focus()
            scrollToBottom()
          }, 200)
        }
      }
      
      // Cmd+Shift+S for quick screenshot
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        handleScreenshotAndAnalyze()
      }
      
      // Cmd+Shift+D for screen selection
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setShowScreenOptions(!showScreenOptions)
        if (!showScreenOptions) {
          loadAvailableScreens()
        }
      }
      
      // Escape to exit chat mode or close screen options
      if (e.key === 'Escape') {
        if (showScreenOptions) {
          setShowScreenOptions(false)
        } else if (isChatMode) {
          setIsChatMode(false)
          setInputValue('')
          setCurrentResponse(null)
          setStreamingText('')
          setIsStreaming(false)
          setLastScreenshot(null)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isChatMode, showScreenOptions, scrollToBottom, handleScreenshotAndAnalyze, loadAvailableScreens])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    if (!isChatMode && e.target.value.trim()) {
      setIsChatMode(true)
      setTimeout(scrollToBottom, 100)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading && !isStreaming) {
      sendMessage(inputValue.trim())
    }
  }

  // Listen for global screenshot capture
  useEffect(() => {
    if (window.electronAPI?.onScreenshotCaptured) {
      window.electronAPI.onScreenshotCaptured((screenshot: string) => {
        setLastScreenshot(screenshot)
        sendMessage("What do you see on my screen?", screenshot)
        if (!isChatMode) setIsChatMode(true)
      })
    }
  }, [isChatMode])

  useEffect(() => {
    // Initialize OpenAI service
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (apiKey) {
      initializeOpenAI(apiKey)
    } else {
      console.warn('OpenAI API key not found. Please add VITE_OPENAI_API_KEY to your .env file')
    }

    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(version => {
        setAppVersion(version)
        setIsInitialized(true)
        setTimeout(updateDimensions, 150)
      })
      
      window.electronAPI.onShortcutTestSuccess(() => {
        setShortcutTestSuccess(true)
        setTimeout(updateDimensions, 100)
      })
    } else {
      setIsInitialized(true)
    }

    loadAvailableScreens()

    const initialTimeout = setTimeout(updateDimensions, 200)
    
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateDimensions, 50)
    })
    
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }

    return () => {
      clearTimeout(initialTimeout)
      resizeObserver.disconnect()
    }
  }, [updateDimensions, loadAvailableScreens])

  // SIMPLIFIED DRAG HANDLERS
  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't drag if clicking on interactive elements
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || 
        target.closest('button') || target.closest('input')) {
      return
    }
    
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && window.electronAPI) {
      e.preventDefault()
      
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      
      window.electronAPI.dragWindow({ deltaX, deltaY })
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false })
      document.addEventListener('mouseup', handleMouseUp, { passive: false })
      document.body.style.userSelect = 'none'
      document.body.style.pointerEvents = 'none'
      document.body.style.cursor = 'grabbing'
    } else {
      document.body.style.userSelect = ''
      document.body.style.pointerEvents = ''
      document.body.style.cursor = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.pointerEvents = ''
      document.body.style.cursor = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div 
      ref={contentRef}
      className={`bg-black/85 backdrop-blur-lg rounded-xl border border-blue-500/20 shadow-lg relative overflow-hidden transition-all duration-300 ${
        isDragging ? 'scale-105 shadow-xl' : ''
      } ${!isInitialized ? 'opacity-0' : 'opacity-100'}`}
      style={{ 
        width: 'fit-content', 
        height: 'fit-content',
        minWidth: '480px',
        maxWidth: '680px',
        transformOrigin: 'center center'
      }}
    >
      {/* ========== CHAT HEADER - ALWAYS VISIBLE ========== */}
      <div 
        ref={headerRef}
        className={`px-4 py-3 bg-black/95 backdrop-blur-lg cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        style={{ 
          WebkitAppRegion: 'drag',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        {/* Status indicator and action buttons */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-2.5 h-2.5 rounded-full ${
                isCapturing ? 'bg-orange-400' : 
                isStreaming ? 'bg-blue-400' : 
                'bg-green-400'
              } animate-pulse`}></div>
            </div>
            
            <div>
              <h1 className="text-white font-medium text-sm">Wingman</h1>
              <p className="text-white/50 text-xs">
                {isCapturing ? 'Capturing...' : 
                 isStreaming ? 'Thinking...' :
                 'Ready'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
            <button
              onClick={() => handleScreenshotAndAnalyze(inputValue || undefined)}
              disabled={isCapturing || isLoading}
              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 border border-blue-400/30 rounded-lg text-sm transition-colors"
              title="Capture screen (⌘⇧S)"
            >
              📸
            </button>
            
            <button
              onClick={() => {
                setShowScreenOptions(!showScreenOptions)
                if (!showScreenOptions) loadAvailableScreens()
              }}
              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg text-sm transition-colors"
              title="Select screen (⌘⇧D)"
            >
              🖥️
            </button>
          </div>
        </div>

        {/* Chat Input - Part of Header */}
        <div className="relative" style={{ WebkitAppRegion: 'no-drag' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit(e))}
            placeholder="Type a message..."
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

        {/* Shortcuts hint */}
        <div className="mt-2 text-center">
          <span className="text-white/30 text-xs">⌘⇧S Screenshot • ⌘⇧D Select • ⎋ Close</span>
        </div>
      </div>

      {/* Screen Selection Dropdown */}
      {showScreenOptions && (
        <div className="p-4 border-b border-blue-500/10 bg-black/90" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
            <h3 className="text-white/80 text-sm mb-3">Select Screen</h3>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {availableScreens.map((screen) => (
                <button
                  key={screen.id}
                  onClick={() => handleScreenCapture(screen.id)}
                  className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/20 rounded-lg p-2 text-left transition-colors"
                >
                  <img 
                    src={screen.thumbnail} 
                    alt={screen.name}
                    className="w-full h-16 object-cover rounded mb-1"
                  />
                  <p className="text-white/70 text-xs truncate">{screen.name}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowScreenOptions(false)}
              className="mt-2 w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/20 px-3 py-2 rounded-lg text-white/80 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Messages Area - Clean minimal response */}
      {(streamingText || isStreaming || currentResponse) && (
        <div 
          ref={messagesContainerRef}
          className="px-6 py-4 bg-black/20 border-t border-blue-500/10 max-h-96 overflow-y-auto custom-scrollbar"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          {/* Streaming response */}
          {(streamingText || isStreaming) && (
            <div className="group relative">
              <button
                onClick={() => streamingText && copyToClipboard(streamingText, 'streaming')}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-md transition-all duration-200 z-10"
                title="Copy response"
              >
                {copiedMessageId === 'streaming' ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                )}
              </button>
              
              <div className="bg-blue-500/5 border border-blue-400/10 rounded-lg px-6 py-4 pr-14 streaming-container">
                <div className="text-sm leading-relaxed space-y-3 text-white/90 select-text max-w-none streaming-text">
                  {streamingText ? (
                    formatResponse(streamingText)
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                      </div>
                      <span className="text-blue-300 text-sm font-medium">Analyzing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Final response */}
          {currentResponse && !isStreaming && (
            <div className="group relative">
              <button
                onClick={() => copyToClipboard(currentResponse.content, currentResponse.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-md transition-all duration-200 z-10"
                title="Copy response"
              >
                {copiedMessageId === currentResponse.id ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                )}
              </button>
              
              <div className="bg-blue-500/5 border border-blue-400/10 rounded-lg px-6 py-4 pr-14 final-response">
                <div className="text-sm leading-relaxed space-y-3 text-white/90 select-text max-w-none">
                  {formatResponse(currentResponse.content)}
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Compact mode welcome content - Only shows when not in chat mode and no messages */}
      {!currentResponse && !streamingText && !isStreaming && (
        <div className="p-5 bg-black/30">
          {shortcutTestSuccess && (
            <div className="mb-4">
              <div className="bg-green-500/20 border border-green-400/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span className="text-green-300 text-sm">Test successful</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="text-center">
            <h2 className="text-white text-lg mb-2">Ready to help</h2>
            <p className="text-white/50 text-sm mb-4">
              Type above, press <kbd className="bg-white/10 px-2 py-1 rounded text-xs">⌘⇧S</kbd> to capture screen, or <kbd className="bg-white/10 px-2 py-1 rounded text-xs">⌘↵</kbd> to chat
            </p>
            
            {appVersion && (
              <div className="pt-3 border-t border-blue-500/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/30">v{appVersion}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span className="text-white/30">Vision Ready</span>
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

// Simple, smooth animation styles
const animationStyles = `
/* Smooth container appearance */
.streaming-container {
  animation: slideIn 0.3s ease-out;
}

.final-response {
  animation: fadeIn 0.4s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Smooth text content changes */
.streaming-text {
  transition: all 0.15s ease-out;
}

/* Better loading animation */
@keyframes pulse-smooth {
  0%, 100% {
    opacity: 0.4;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

.animate-pulse {
  animation: pulse-smooth 1.8s ease-in-out infinite;
}

/* Subtle hover effects */
.group:hover .streaming-container,
.group:hover .final-response {
  transform: translateY(-1px);
  transition: transform 0.2s ease-out;
}
`

// Inject styles into document
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = animationStyles
  if (!document.head.querySelector('style[data-wingman-styles]')) {
    styleElement.setAttribute('data-wingman-styles', 'true')
    document.head.appendChild(styleElement)
  }
}