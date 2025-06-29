import React from 'react'
import type { User, GoogleConnection, CalendarEvent } from '../../../electron/preload'
import type { ProfileModeProps } from '../../types/modes'

/** Shows user profile information, connected services status, and account management options. */
export const ProfileMode: React.FC<ProfileModeProps> = ({
  user,
  googleConnection,
  calendarEvents,
  handleSignOut,
  requestLocationPermission
}) => {
  const formatEventTime = (event: CalendarEvent): string => {
    if (event.start.date) {
      return 'All day'
    }
    
    const start = new Date(event.start.dateTime!)
    const end = new Date(event.end.dateTime!)
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
    
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  return (
    <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar" style={{ WebkitAppRegion: 'no-drag' }}>
      <div className="space-y-4">
        {/* User Info Section */}
        <div className="space-y-3">
          <h3 className="text-white font-medium">User Profile</h3>
          
          <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4">
            <div className="flex items-center gap-4">
              {user?.photoURL && (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full border-2 border-blue-400/30"
                />
              )}
              <div className="flex-1">
                <div className="text-white font-medium text-lg">{user?.displayName}</div>
                <div className="text-white/70 text-sm">{user?.email}</div>
                <div className="text-blue-300 text-xs mt-1 font-mono">
                  ID: {user?.uid}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Status Section */}
        <div className="space-y-3">
          <h4 className="text-white/80 font-medium text-sm">Connected Services</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-400/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${googleConnection.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <div>
                  <div className="text-white/90 text-sm font-medium">Google Drive</div>
                  <div className="text-white/60 text-xs">File storage and search</div>
                </div>
              </div>
              <div className="text-xs text-white/60">
                {googleConnection.isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-400/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${googleConnection.isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <div>
                  <div className="text-white/90 text-sm font-medium">Google Calendar</div>
                  <div className="text-white/60 text-xs">Schedule and events</div>
                </div>
              </div>
              <div className="text-xs text-white/60">
                {googleConnection.isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
        </div>

        {/* Sync Status Section */}
        {googleConnection.isConnected && (
          <div className="space-y-3">
            <h4 className="text-white/80 font-medium text-sm">Sync Status</h4>
            
            <div className="bg-gray-500/10 border border-gray-400/20 rounded-lg p-3">
              <div className="space-y-2 text-xs">
                {googleConnection.lastDriveSyncAt && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Last Drive sync:</span>
                    <span className="text-white/80">
                      {new Date(googleConnection.lastDriveSyncAt).toLocaleString()}
                    </span>
                  </div>
                )}
                
                {googleConnection.lastCalendarSyncAt && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Last Calendar sync:</span>
                    <span className="text-white/80">
                      {new Date(googleConnection.lastCalendarSyncAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {googleConnection.connectedAt && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Connected since:</span>
                    <span className="text-white/80">
                      {new Date(googleConnection.connectedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Today's Schedule Preview */}
        {calendarEvents.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-white/80 font-medium text-sm">Today's Schedule</h4>
            
            <div className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-3">
              <div className="text-xs text-purple-300 mb-2">
                {calendarEvents.length} event{calendarEvents.length !== 1 ? 's' : ''} scheduled
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                {calendarEvents.slice(0, 5).map((event, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                    <div className="text-xs text-white/70 truncate flex-1">
                      {formatEventTime(event)} - {event.summary}
                    </div>
                  </div>
                ))}
                {calendarEvents.length > 5 && (
                  <div className="text-xs text-white/50 pl-3">
                    +{calendarEvents.length - 5} more events...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sign Out */}
        <div className="pt-3 border-t border-blue-500/10">
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-lg text-white text-sm transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>

        {/* Location Test */}
        <div className="pt-3 border-t border-green-500/10">
          <button
            onClick={async () => {
              const location = await requestLocationPermission()
              if (location) {
                console.log('✅ Location test successful:', location)
                alert(`Location: ${location.lat}, ${location.lng}`)
              } else {
                console.log('❌ Location test failed')
                alert('Location test failed')
              }
            }}
            className="w-full px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded-lg text-white text-sm transition-colors font-medium"
          >
            🌍 Test Location
          </button>
        </div>
      </div>
    </div>
  )
}