import { useEffect } from 'react'
import type { AppMode, CalendarRange } from '../types/app'
import type { User, GoogleConnection } from '../../electron/preload'

interface UseKeyboardShortcutsProps {
  currentMode: AppMode
  setCurrentMode: (mode: AppMode | ((prev: AppMode) => AppMode)) => void
  user: User | null
  googleConnection: GoogleConnection
  selectedCalendarRange: CalendarRange
  loadCalendarEvents: (range: CalendarRange) => void
}

export function useKeyboardShortcuts({
  currentMode,
  setCurrentMode,
  user,
  googleConnection,
  selectedCalendarRange,
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
      
      // Cmd+Enter to cycle through modes
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (user && googleConnection.isConnected) {
          setCurrentMode(prev => {
            const modes: AppMode[] = ['chat', 'drive', 'calendar', 'profile', 'cleanup', 'organize']
            const currentIndex = modes.indexOf(prev)
            const nextMode = modes[(currentIndex + 1) % modes.length]
            
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
  }, [currentMode, setCurrentMode, user, googleConnection, selectedCalendarRange, loadCalendarEvents])
}
