import { useState, useEffect } from 'react'
import type { PendingCapture, GoogleConnection } from '../types/app'

export function usePendingCaptures(googleConnection: GoogleConnection) {
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null)
  const [docsNotification, setDocsNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isCreatingNote, setIsCreatingNote] = useState(false)

  // Shows temporary notification for Google Docs operations
  const showDocsNotification = (type: 'success' | 'error', message: string) => {
    setDocsNotification({ type, message })
    setTimeout(() => setDocsNotification(null), 5000)
  }

  // Sets up listener for global screenshot capture events
  useEffect(() => {
    if (window.electronAPI?.onScreenshotCaptured) {
      console.log('Setting up screenshot listener')
      window.electronAPI.onScreenshotCaptured((screenshot: string) => {
        console.log('Screenshot received in React!', screenshot.substring(0, 50) + '...')
        setPendingCapture({
          type: 'screenshot',
          data: screenshot,
          timestamp: new Date()
        })
      })
    }
  }, [])

  return {
    pendingCapture,
    setPendingCapture,
    docsNotification,
    isCreatingNote,
    showDocsNotification
  }
}
