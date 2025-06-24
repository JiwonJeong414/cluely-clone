import React, { useEffect, useState, useRef, useCallback } from 'react'

function App() {
  const [appVersion, setAppVersion] = useState<string>('')
  const [shortcutTestSuccess, setShortcutTestSuccess] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const contentRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
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
      className={`bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 relative overflow-hidden font-sans transition-all duration-200 ${
        isDragging ? 'scale-105 shadow-2xl' : 'shadow-lg'
      }`}
      style={{ width: 'fit-content', height: 'fit-content', minWidth: '360px' }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
      
      {/* Draggable header area */}
      <div 
        className={`relative px-6 py-4 cursor-move select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        style={{ 
          ['-webkit-app-region' as any]: 'drag',
          pointerEvents: isDragging ? 'none' : 'auto'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="relative">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-3 h-3 bg-green-400/30 rounded-full animate-ping"></div>
            </div>
            
            <div>
              <h1 className="text-white/90 font-medium text-base tracking-tight">Wingman</h1>
              <p className="text-white/40 text-sm">Ready</p>
            </div>
          </div>
          
          {/* Quick actions - with more spacing */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <kbd className="bg-white/10 border border-white/20 px-2 py-1 rounded text-xs text-white/60 font-mono">⌘</kbd>
              <kbd className="bg-white/10 border border-white/20 px-2 py-1 rounded text-xs text-white/60 font-mono">␣</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal content when not expanded */}
      {shortcutTestSuccess && (
        <div className="px-6 pb-4">
          <div className="bg-green-500/20 border border-green-400/30 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-300 text-sm">Test successful</span>
            </div>
          </div>
        </div>
      )}

      {/* Version info - with better spacing */}
      {appVersion && (
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-white/30 text-sm font-mono">v{appVersion}</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              <span className="text-white/30 text-sm">Online</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App