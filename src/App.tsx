import React, { useEffect, useState } from 'react'

function App() {
  const [appVersion, setAppVersion] = useState<string>('')

  useEffect(() => {
    // Get app version from Electron main process
    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(version => {
        setAppVersion(version)
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Cluely Clone
        </h1>
        <p className="text-gray-600 mb-4">
          Welcome to your Electron + Vite + React application!
        </p>
        {appVersion && (
          <p className="text-sm text-gray-500">
            App Version: {appVersion}
          </p>
        )}
        <div className="mt-6 space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Electron</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Vite</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-gray-700">React</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-sm text-gray-700">TypeScript</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App