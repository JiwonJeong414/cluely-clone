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
    <div className="w-full h-full bg-black/80 backdrop-blur-md rounded-lg border border-white/20 shadow-2xl">
      <div className="p-4">
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-white font-semibold text-lg">Cluely</h1>
          <button
            onClick={handleHide}
            className="text-white/70 hover:text-white text-xl leading-none"
            title="Hide (or press Cmd+Space)"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="text-white/90 space-y-3">
          <p className="text-sm">
            Press <kbd className="bg-white/20 px-2 py-1 rounded text-xs">Cmd+Space</kbd> anywhere to toggle this window
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm">Floating overlay active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${shortcutTestSuccess ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span className="text-sm">
                {shortcutTestSuccess ? 'Global shortcuts working!' : 'Testing global shortcuts...'}
              </span>
            </div>
            {!shortcutTestSuccess && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm">Press Cmd+Shift+T to test shortcuts</span>
              </div>
            )}
          </div>

          {appVersion && (
            <p className="text-xs text-white/60">
              v{appVersion}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default App