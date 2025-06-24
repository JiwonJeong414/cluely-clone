import React, { useEffect, useState } from 'react'

function App() {
  const [appVersion, setAppVersion] = useState<string>('')
  const [shortcutTestSuccess, setShortcutTestSuccess] = useState<boolean>(false)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(version => {
        setAppVersion(version)
      })
      
      // Listen for shortcut test success
      window.electronAPI.onShortcutTestSuccess(() => {
        console.log('🎉 Shortcut test success received in React!')
        setShortcutTestSuccess(true)
      })
    }
  }, [])

  const handleHide = () => {
    window.electronAPI?.hideWindow()
  }

  return (
    <div className="w-full h-full bg-red-500">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20"></div>
      </div>
      
      <div className="relative p-5">
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