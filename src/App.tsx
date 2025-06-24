import React, { useEffect, useState, useRef, useCallback } from 'react'

console.log('🚀 APP.TSX IS LOADING!!!')
console.log('🚀 APP.TSX IS LOADING!!!')
console.log('🚀 APP.TSX IS LOADING!!!')

function App() {
  console.log('🎯 APP COMPONENT FUNCTION CALLED!!!')
  const [appVersion, setAppVersion] = useState<string>('')
  const [shortcutTestSuccess, setShortcutTestSuccess] = useState<boolean>(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const updateDimensions = useCallback(() => {
    console.log('🔧 updateDimensions called')
    if (contentRef.current && window.electronAPI?.updateContentDimensions) {
      console.log('✅ Both contentRef and electronAPI available')
      
      // Force a reflow to ensure accurate measurements
      const element = contentRef.current
      
      // Get the actual rendered dimensions
      const rect = element.getBoundingClientRect()
      
      // Calculate actual content size
      const width = Math.ceil(rect.width)
      const height = Math.ceil(rect.height)
      
      console.log('📏 Content rect:', rect)
      console.log('📏 Computed dimensions:', { width, height })
      
      if (width > 0 && height > 0) {
        console.log('🚀 Calling updateContentDimensions...')
        window.electronAPI.updateContentDimensions({ width, height })
      } else {
        console.log('❌ Invalid dimensions, not updating')
      }
    } else {
      console.log('❌ Missing requirements:', {
        contentRef: !!contentRef.current,
        electronAPI: !!window.electronAPI,
        updateContentDimensions: !!window.electronAPI?.updateContentDimensions
      })
    }
  }, [])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(version => {
        setAppVersion(version)
        // Update dimensions when shortcut test state changes
  useEffect(() => {
    if (shortcutTestSuccess) {
      setTimeout(updateDimensions, 100)
    }
  }, [shortcutTestSuccess, updateDimensions]) //dimensions after version is loaded
        setTimeout(updateDimensions, 150)
      })
      
      // Listen for shortcut test success
      window.electronAPI.onShortcutTestSuccess(() => {
        console.log('🎉 Shortcut test success received in React!')
        setShortcutTestSuccess(true)
        // Update dimensions after state change
        setTimeout(updateDimensions, 100)
      })
    }

    // Initial size update with a delay to ensure content is rendered
    const initialTimeout = setTimeout(updateDimensions, 200)
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      console.log('🔄 ResizeObserver triggered')
      // Small delay to ensure layout is complete
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

  // Update

  const handleHide = () => {
    window.electronAPI?.hideWindow()
  }

  return (
    <div 
      ref={contentRef}
      className="bg-black/90 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-600/30 relative overflow-hidden font-sans min-w-[300px]"
      style={{ width: 'fit-content', height: 'fit-content' }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20"></div>
      </div>
      
      <div className="relative p-5 w-[360px]"> {/* Fixed content width */}
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-bold">W</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg tracking-tight">Wingman</h1>
              <p className="text-gray-400 text-xs">AI assistant overlay</p>
            </div>
          </div>
          <button 
            onClick={handleHide}
            className="w-7 h-7 rounded-full bg-gray-800/60 hover:bg-gray-700/80 flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-gray-600/30"
          >
            ×
          </button>
        </div>
        
        {/* Status */}
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-lg p-3 mb-5 border border-gray-600/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-sm shadow-green-400/50"></div>
              <span className="text-gray-200 text-sm font-medium">Ready</span>
            </div>
            <span className="text-green-400 text-xs font-mono uppercase tracking-wide">Online</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="space-y-3">
          <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider">Controls</h3>
          
          <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-600/20 hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-gray-200 text-sm">Toggle Window</span>
              <div className="flex gap-1">
                <kbd className="bg-gray-700/60 border border-gray-600/40 px-2 py-1 rounded text-xs text-gray-300 font-mono">⌘</kbd>
                <kbd className="bg-gray-700/60 border border-gray-600/40 px-2 py-1 rounded text-xs text-gray-300 font-mono">Space</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Shortcut test feedback */}
        {shortcutTestSuccess && (
          <div className="mt-3 bg-green-800/30 border border-green-600/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-300 text-sm">Shortcut test successful!</span>
            </div>
          </div>
        )}

        {/* Footer */}
        {appVersion && (
          <div className="mt-5 pt-3 border-t border-gray-700/30">
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-xs font-mono">v{appVersion}</p>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                <span className="text-gray-500 text-xs">Active</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App