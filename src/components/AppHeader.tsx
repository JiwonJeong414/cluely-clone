import React from 'react'
import { AudioButton } from './AudioButton'
import type { AppMode, User, GoogleConnection, CalendarEvent } from '../types/app'
import { AuthButton } from './AuthButton'

interface AppHeaderProps {
  // State
  user: User | null
  googleConnection: GoogleConnection
  currentMode: AppMode
  calendarEvents: CalendarEvent[]
  isSyncing: boolean
  isStreaming: boolean
  isLoadingCalendar: boolean
  inputValue: string
  isLoading: boolean
  pendingCapture: any
  docsNotification: { type: 'success' | 'error'; message: string } | null
  isCreatingNote: boolean
  
  // Actions
  setCurrentMode: (mode: AppMode) => void
  setInputValue: (value: string) => void
  handleSubmit: (e: React.FormEvent) => void
  handleSignIn: () => Promise<void>
  handleSignOut: () => Promise<void>
  handleAudioProcessed: (transcription: string) => void
  loadCalendarEvents: (range: any) => Promise<void>
  
  // Refs
  inputRef: React.RefObject<HTMLInputElement>
  
  // Drag handlers
  isDragging: boolean
  handleMouseDown: (e: React.MouseEvent) => void

  // New props
  onSignIn: () => void
  onSignOut: () => void
  onSetMode: (mode: string) => void
  onLoadCalendarEvents: () => void
  selectedCalendarRange: string
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  googleConnection,
  currentMode,
  calendarEvents,
  isSyncing,
  isStreaming,
  isLoadingCalendar,
  inputValue,
  isLoading,
  pendingCapture,
  docsNotification,
  isCreatingNote,
  setCurrentMode,
  setInputValue,
  handleSubmit,
  handleSignIn,
  handleSignOut,
  handleAudioProcessed,
  loadCalendarEvents,
  inputRef,
  isDragging,
  handleMouseDown,
  onSignIn,
  onSignOut,
  onSetMode,
  onLoadCalendarEvents,
  selectedCalendarRange
}) => {
  return (
    <div 
      className={`px-4 py-3 bg-black/95 backdrop-blur-lg cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
      onMouseDown={handleMouseDown}
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${
              isSyncing ? 'bg-orange-400' : 
              isStreaming ? 'bg-blue-400' : 
              isLoadingCalendar ? 'bg-purple-400' :
              'bg-green-400'
            } animate-pulse`}></div>
          </div>
          
          <div>
            <h1 className="text-white font-medium text-sm">
              Wingman {user && googleConnection.isConnected && `• ${currentMode}`}
            </h1>
            <p className="text-white/50 text-xs">
              {user ? `${user.displayName} • ${googleConnection.isConnected ? 'Google Services Connected' : 'Google Services Disconnected'}` : 'Not signed in'}
              {currentMode === 'calendar' && calendarEvents.length > 0 && ` • ${calendarEvents.length} events`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' }}>
          {user && (
            <>
              <button
                onClick={() => setCurrentMode('drive')}
                className={`p-2 border rounded-lg text-sm transition-colors ${
                  currentMode === 'drive' 
                    ? 'bg-blue-500/30 border-blue-400/50' 
                    : 'bg-blue-500/10 border-blue-400/20 hover:bg-blue-500/20'
                }`}
                title="Drive mode (⌘⇧D)"
              >
                💾
              </button>
              <button
                onClick={() => {
                  setCurrentMode('calendar')
                  if (googleConnection.isConnected) {
                    loadCalendarEvents('today')
                  }
                }}
                className={`p-2 border rounded-lg text-sm transition-colors ${
                  currentMode === 'calendar' 
                    ? 'bg-purple-500/30 border-purple-400/50' 
                    : 'bg-purple-500/10 border-purple-400/20 hover:bg-purple-500/20'
                }`}
                title="Calendar mode (⌘⇧C)"
              >
                📅
              </button>
              <button
                onClick={() => setCurrentMode('maps')}
                className={`p-2 border rounded-lg text-sm transition-colors ${
                  currentMode === 'maps' 
                    ? 'bg-green-500/30 border-green-400/50' 
                    : 'bg-green-500/10 border-green-400/20 hover:bg-green-500/20'
                }`}
                title="Maps mode"
              >
                🗺️
              </button>
              <button
                onClick={() => setCurrentMode('profile')}
                className={`p-2 border rounded-lg text-sm transition-colors ${
                  currentMode === 'profile' 
                    ? 'bg-green-500/30 border-green-400/50' 
                    : 'bg-green-500/10 border-green-400/20 hover:bg-green-500/20'
                }`}
                title="Profile (⌘⇧P)"
              >
                👤
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chat Input */}
      {currentMode === 'chat' && (
        <div className="relative" style={{ WebkitAppRegion: 'no-drag' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit(e))}
            placeholder={
              pendingCapture 
                ? (pendingCapture.type === 'screenshot' 
                    ? "Ask about the screen" 
                    : "Ask about the audio")
                : (googleConnection.isConnected ? "I'm your AI Wingman, request anything" : "Type a message...")
            }
            className="w-full bg-blue-500/10 border border-blue-400/20 rounded-lg px-4 py-3 pr-32 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-colors text-sm"
            disabled={isLoading || isStreaming}
            autoFocus
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            <AudioButton 
              onAudioProcessed={handleAudioProcessed}
              className="flex-shrink-0"
            />
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isLoading || isStreaming}
              className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs transition-colors"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Mode shortcuts */}
      <div className="mt-2 text-center">
        <span className="text-white/30 text-xs">
          {user ? '⌘↵ Switch • ⌘⇧D Drive • ⌘⇧C Calendar • 🗺️ Maps • ⌘⇧P Profile • ⎋ Chat' : '⌘⇧S Screenshot • ⎋ Close'}
        </span>
      </div>
    </div>
  )
}

export default AppHeader 