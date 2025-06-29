import { useState, useEffect } from 'react'
import type { PendingCapture } from '../types/app'
import type { GoogleConnection } from '../../electron/preload'

export function usePendingCaptures(googleConnection: GoogleConnection) {
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null)
  const [docsNotification, setDocsNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isCreatingNote, setIsCreatingNote] = useState(false)

  const showDocsNotification = (type: 'success' | 'error', message: string) => {
    setDocsNotification({ type, message })
    setTimeout(() => setDocsNotification(null), 5000)
  }

  // Listen for global screenshot capture
  useEffect(() => {
    if (window.electronAPI?.onScreenshotCaptured) {
      console.log('Setting up screenshot listener')
      window.electronAPI.onScreenshotCaptured((screenshot: string) => {
        console.log('📸 Screenshot received in React!', screenshot.substring(0, 50) + '...')
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
