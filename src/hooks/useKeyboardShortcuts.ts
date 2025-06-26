import { useEffect } from 'react'
import type { AppMode, CalendarRange } from '../types/app'

interface UseKeyboardShortcutsProps {
  user: any
  googleConnection: any
  selectedCalendarRange: CalendarRange
  setCurrentMode: (mode: AppMode | ((prev: AppMode) => AppMode)) => void
  loadCalendarEvents: (range: CalendarRange) => Promise<void>
}

export function useKeyboardShortcuts({
  user,
  googleConnection,
  selectedCalendarRange,
  setCurrentMode,
  loadCalendarEvents
}: UseKeyboardShortcutsProps) {
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+D for Drive mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        console.log('Cmd+Shift+D pressed in React component')
        e.preventDefault()
        setCurrentMode('drive')
        
        if (window.electronAPI?.showWindow) {
          window.electronAPI.showWindow()
        }
      }
      
      // Cmd+Shift+C for Calendar mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        setCurrentMode('calendar')
        
        // Load calendar events when switching to calendar mode
        if (user && googleConnection.isConnected) {
          loadCalendarEvents(selectedCalendarRange)
        }
        
        if (window.electronAPI?.showWindow) {
          window.electronAPI.showWindow()
        }
      }
      
      // Cmd+Shift+P for Profile mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setCurrentMode('profile')
        
        if (window.electronAPI?.showWindow) {
          window.electronAPI.showWindow()
        }
      }
      
      // Cmd+Enter to cycle through modes (only if authenticated)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (user && googleConnection.isConnected) {
          setCurrentMode((prev: AppMode) => {
            const modes: AppMode[] = ['chat', 'drive', 'calendar', 'profile', 'cleanup', 'organize']
            const currentIndex = modes.indexOf(prev)
            const nextMode = modes[(currentIndex + 1) % modes.length]
            
            // Load calendar events when switching to calendar mode
            if (nextMode === 'calendar') {
              loadCalendarEvents(selectedCalendarRange)
            }
            
            return nextMode
          })
        } else {
          setCurrentMode('drive')
        }
      }
      
      // Escape to return to chat
      if (e.key === 'Escape') {
        setCurrentMode('chat')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [user, googleConnection, selectedCalendarRange, setCurrentMode, loadCalendarEvents])
} 