import { useState, useCallback, useEffect, RefObject } from 'react'
import type { AppMode } from '../types/app'

export function useApp(contentRef: RefObject<HTMLDivElement | null>) {
  const [appVersion, setAppVersion] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentMode, setCurrentMode] = useState<AppMode>('chat')
  const [isDragging, setIsDragging] = useState(false)

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
  }, [contentRef])

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || 
        target.closest('button') || target.closest('input')) {
      return
    }
    
    e.preventDefault()
    setIsDragging(true)
  }

  // Set up drive mode toggle listener
  useEffect(() => {
    if (window.electronAPI?.onToggleDriveMode) {
      const handleToggleDriveMode = () => {
        console.log('🎯 Drive mode toggle received from main process')
        setCurrentMode('drive')
        
        if (window.electronAPI?.showWindow) {
          window.electronAPI.showWindow()
        }
      }
      
      window.electronAPI.onToggleDriveMode(handleToggleDriveMode)
      
      return () => {
        console.log('Cleaning up Drive mode toggle listener')
      }
    }
  }, [])

  // Load app version
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(version => {
        setAppVersion(version)
        setIsInitialized(true)
        setTimeout(updateDimensions, 150)
      })
    } else {
      setIsInitialized(true)
    }
  }, [updateDimensions])

  return {
    appVersion,
    isInitialized,
    currentMode,
    setCurrentMode,
    isDragging,
    setIsDragging,
    updateDimensions,
    handleMouseDown
  }
}
