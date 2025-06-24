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
  const contentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const updateDimensions = useCallback(() => {
    if (contentRef.current && window.electronAPI?.updateContentDimensions) {
      // Use a more reliable method to get dimensions
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

  // Improved scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      // Use smooth scrolling with a slight delay to ensure DOM is updated
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      })
    }
  }, [])

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
          // Focus input when entering chat mode and scroll to bottom
          setTimeout(() => {
            inputRef.current?.focus()
            scrollToBottom()
          }, 200) // Increased delay for better UX
        }
      }
      
      // Escape to exit chat mode
      if (e.key === 'Escape' && isChatMode) {
        setIsChatMode(false)
        setInputValue('')
        setCurrentResponse(null)
        setStreamingText('')
        setIsStreaming(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isChatMode, scrollToBottom])

  // Handle input changes to ensure chat mode stays visible when typing
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setInputValue(e.target.value)
    // If user starts typing and not in chat mode, enter chat mode
    if (!isChatMode && e.target.value.trim()) {
      setIsChatMode(true)
      // Scroll to bottom when entering chat mode
      setTimeout(scrollToBottom, 100)
    }
  }

  // Send message to OpenAI with streaming
  const sendMessage = async (userMessage: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }

    // Clear previous response and start streaming
    setCurrentResponse(null)
    setStreamingText('')
    setIsLoading(true)
    setIsStreaming(true)
    setInputValue('')

    try {
      // For context, we'll use the current response if it exists
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

      const openai = getOpenAI()
      
      // Use streaming for live response
      let fullResponse = ''
      await openai.sendMessageStream(chatMessages, (chunk: string) => {
        fullResponse += chunk
        setStreamingText(fullResponse)
        
        // Update dimensions more aggressively during streaming
        requestAnimationFrame(() => {
          updateDimensions()
        })
      })
      
      // Create final message
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date()
      }

      setCurrentResponse(assistantMsg)
      setStreamingText('')
      setIsStreaming(false)
      
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error 
          ? `Error: ${error.message}` 
          : 'Sorry, I encountered an error. Please check your API key and try again.',
        timestamp: new Date()
      }
      setCurrentResponse(errorMsg)
      setStreamingText('')
      setIsStreaming(false)
    } finally {
      setIsLoading(false)
      // Re-focus input after response is complete
      setTimeout(() => {
        inputRef.current?.focus()
        updateDimensions()
      }, 200)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading && !isStreaming) {
      sendMessage(inputValue.trim())
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

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
  }, [updateDimensions])

  // Improved mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
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
      
      // Send drag delta to main process with higher frequency
      window.electronAPI.dragWindow({ deltaX, deltaY })
      
      // Update drag start position for next movement
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      // Add passive: false to ensure preventDefault works
      document.addEventListener('mousemove', handleMouseMove, { passive: false })
      document.addEventListener('mouseup', handleMouseUp, { passive: false })
      
      // Prevent text selection during drag
      document.body.style.userSelect = 'none'
      document.body.style.pointerEvents = 'none'
    } else {
      // Restore normal behavior
      document.body.style.userSelect = ''
      document.body.style.pointerEvents = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.pointerEvents = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div 
      ref={contentRef}
      className={`bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 relative overflow-hidden font-sans transition-all duration-300 ${
        isDragging ? 'scale-105 shadow-2xl' : 'shadow-lg'
      } ${!isInitialized ? 'opacity-0' : 'opacity-100'}`}
      style={{ 
        width: 'fit-content', 
        height: 'fit-content',
        minWidth: isChatMode ? '550px' : '360px',
        maxWidth: '800px',
        maxHeight: 'none', // Remove height restriction for proper resizing
        transformOrigin: 'center center'
      }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
      
      {/* Draggable header area */}
      <div 
        className={`relative px-6 py-4 cursor-move select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        style={{ 
          WebkitAppRegion: 'drag',
          pointerEvents: isDragging ? 'none' : 'auto'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="relative">
              <div className={`w-3 h-3 ${isChatMode ? 'bg-blue-400' : 'bg-green-400'} rounded-full animate-pulse`}></div>
              <div className={`absolute inset-0 w-3 h-3 ${isChatMode ? 'bg-blue-400/30' : 'bg-green-400/30'} rounded-full animate-ping`}></div>
            </div>
            
            <div>
              <h1 className="text-white/90 font-medium text-base tracking-tight">Wingman</h1>
              <p className="text-white/40 text-sm">{isChatMode ? 'Chat Mode' : 'Ready'}</p>
            </div>
          </div>
          
          {/* Quick actions */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <kbd className="bg-white/10 border border-white/20 px-2 py-1 rounded text-xs text-white/60 font-mono">⌘</kbd>
              <kbd className="bg-white/10 border border-white/20 px-2 py-1 rounded text-xs text-white/60 font-mono">↵</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      {isChatMode && (
        <>
          {/* Messages Container with improved scrolling */}
          <div 
            ref={messagesContainerRef}
            className="px-6 overflow-y-auto custom-scrollbar flex-1 scroll-smooth" 
            style={{ 
              maxHeight: '450px',
              scrollBehavior: 'smooth'
            }}
          >
            {(!currentResponse && !streamingText && !isStreaming) ? (
              <div className="py-8 text-center">
                <div className="text-white/40 text-sm mb-2">🤖 AI Assistant Ready</div>
                <div className="text-white/30 text-xs">Type your message below to start chatting</div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {(streamingText || isStreaming) && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-xl px-4 py-3 bg-gray-500/20 border border-gray-400/30 text-gray-100">
                      <div className="text-sm whitespace-pre-wrap">{streamingText}</div>
                      <div className="text-xs opacity-50 mt-1">AI is typing...</div>
                    </div>
                  </div>
                )}
                {currentResponse && !isStreaming && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-xl px-4 py-3 bg-gray-500/20 border border-gray-400/30 text-gray-100">
                      <div className="text-sm whitespace-pre-wrap">{currentResponse.content}</div>
                      <div className="text-xs opacity-50 mt-1">
                        {currentResponse.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )}
                {isLoading && !isStreaming && (
                  <div className="flex justify-start">
                    <div className="bg-gray-500/20 border border-gray-400/30 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-white/40 text-xs">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} style={{ height: '1px' }} />
              </div>
            )}
          </div>

          {/* Chat Input - Always visible in chat mode */}
          <div className="px-6 pb-4 pt-2 border-t border-white/10 mt-auto">
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                placeholder="Type your message..."
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
                rows={3}
                disabled={isLoading || isStreaming}
                style={{ WebkitAppRegion: 'no-drag' }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading || isStreaming}
                className="absolute bottom-2 right-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                style={{ WebkitAppRegion: 'no-drag' }}
              >
                Send
              </button>
            </form>
            <div className="mt-2 text-center">
              <span className="text-white/30 text-xs">Press Escape to close • Cmd+Enter to toggle</span>
            </div>
          </div>
        </>
      )}

      {/* Minimal content when not in chat mode */}
      {!isChatMode && shortcutTestSuccess && (
        <div className="px-6 pb-4">
          <div className="bg-green-500/20 border border-green-400/30 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-300 text-sm">Test successful</span>
            </div>
          </div>
        </div>
      )}

      {/* Version info */}
      {!isChatMode && appVersion && (
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-white/30 text-sm font-mono">v{appVersion}</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              <span className="text-white/30 text-sm">Ready for Chat</span>
            </div>
          </div>
        </div>
      )}

      {/* Chat mode hint */}
      {!isChatMode && (
        <div className="px-6 pb-4">
          <div className="text-center">
            <div className="text-white/20 text-xs">Press Cmd+Enter to start chatting or just start typing</div>
          </div>
        </div>
      )}

      {/* Hidden input to capture typing when not in chat mode */}
      {!isChatMode && isInitialized && (
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className="sr-only"
          style={{ 
            position: 'absolute',
            left: '-9999px',
            top: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none'
          }}
          autoFocus
        />
      )}
    </div>
  )
}

export default App