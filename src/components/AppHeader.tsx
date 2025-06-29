// src/components/AppHeader.tsx - Updated to remove duplicate ChatInput
import React from 'react'
import type { AppMode } from '../types/app'
import type { User, GoogleConnection, CalendarEvent } from '../../electron/preload'

interface AppHeaderProps {
  user: User | null
  googleConnection: GoogleConnection
  currentMode: AppMode
  setCurrentMode: (mode: AppMode) => void
  calendarEvents: CalendarEvent[]
  isDragging: boolean
  handleMouseDown: (e: React.MouseEvent) => void
  appVersion: string
  pendingCapture: any
  onSignIn: () => Promise<void>
  onSignOut: () => Promise<void>
  isAuthenticating: boolean
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  user,
  googleConnection,
  currentMode,
  setCurrentMode,
  calendarEvents,
  isDragging,
  handleMouseDown,
  appVersion,
  pendingCapture
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
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></div>
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
                onClick={() => setCurrentMode('calendar')}
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

      {/* Mode shortcuts */}
      <div className="mt-2 text-center">
        <span className="text-white/30 text-xs">
          {user ? '⌘↵ Switch • ⌘⇧D Drive • ⌘⇧C Calendar • 🗺️ Maps • ⌘⇧P Profile • ⎋ Chat' : '⌘⇧S Screenshot • ⎋ Close'}
        </span>
      </div>
    </div>
  )
}