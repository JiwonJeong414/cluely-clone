import { useState, useCallback, useEffect, RefObject } from 'react'
import type { AppMode } from '../types/app'

export function useApp(contentRef: RefObject<HTMLDivElement | null>) {
  const [appVersion, setAppVersion] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentMode, setCurrentMode] = useState<AppMode>('chat')
  const [isDragging, setIsDragging] = useState(false)

  // Updates window dimensions when content size changes
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

  // Handles mouse down events for window dragging (excludes buttons/inputs)
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || 
        target.closest('button') || target.closest('input')) {
      return
    }
    
    e.preventDefault()
    setIsDragging(true)
  }

  // Sets up drive mode toggle listener from main process
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

  // Loads app version and initializes the app
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
