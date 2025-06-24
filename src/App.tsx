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
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const updateDimensions = useCallback(() => {
    if (contentRef.current && window.electronAPI?.updateContentDimensions) {
      const rect = contentRef.current.getBoundingClientRect()
      const width = Math.ceil(rect.width)
      const height = Math.ceil(rect.height)
      
      if (width > 0 && height > 0) {
        window.electronAPI.updateContentDimensions({ width, height })
      }
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter to toggle chat mode
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        setIsChatMode(!isChatMode)
        if (!isChatMode) {
          // Focus input when entering chat mode
          setTimeout(() => inputRef.current?.focus(), 100)
        }
      }
      
      // Escape to exit chat mode
      if (e.key === 'Escape' && isChatMode) {
        setIsChatMode(false)
        setInputValue('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isChatMode])

  // Send message to OpenAI
  const sendMessage = async (userMessage: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setInputValue('')

    try {
      // Convert messages to OpenAI format
      const chatMessages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are Wingman, a helpful AI assistant integrated into a desktop app. Keep responses concise and helpful.'
        },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        {
          role: 'user',
          content: userMessage
        }
      ]

      const openai = getOpenAI()
      const response = await openai.sendMessage(chatMessages)
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMsg])
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
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
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
        setTimeout(updateDimensions, 150)
      })
      
      window.electronAPI.onShortcutTestSuccess(() => {
        setShortcutTestSuccess(true)
        setTimeout(updateDimensions, 100)
      })
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
      }`}
      style={{ 
        width: 'fit-content', 
        height: 'fit-content', 
        minWidth: isChatMode ? '500px' : '360px',
        maxHeight: isChatMode ? '600px' : 'auto'
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
        <div className="px-6 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20">
          {messages.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-white/40 text-sm mb-2">🤖 AI Assistant Ready</div>
              <div className="text-white/30 text-xs">Type your message below to start chatting</div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-500/20 border border-blue-400/30 text-blue-100' 
                      : 'bg-gray-500/20 border border-gray-400/30 text-gray-100'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-50 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
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
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Chat Input */}
      {isChatMode && (
        <div className="px-6 pb-4">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
              rows={3}
              disabled={isLoading}
              style={{ WebkitAppRegion: 'no-drag' }}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
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
            <div className="text-white/20 text-xs">Press Cmd+Enter to start chatting</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App