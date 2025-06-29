import React from 'react'
import type { User, GoogleConnection, CalendarEvent } from '../../../electron/preload'
import type { AppMode, CalendarRange } from '../../types/app'
import type { CalendarModeProps } from '../../types/modes'

/** Displays and manages Google Calendar events with time range filters and event creation capabilities. */
export const CalendarMode: React.FC<CalendarModeProps> = ({
  user,
  googleConnection,
  calendarEvents,
  selectedCalendarRange,
  isLoadingCalendar,
  showCreateEventForm,
  setShowCreateEventForm,
  newEvent,
  setNewEvent,
  isCreatingEvent,
  handleCalendarRangeChange,
  handleCreateEvent,
  setCurrentMode
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
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Calendar</h3>
          <div className="flex gap-1">
            {(['today', 'week', 'next-week'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleCalendarRangeChange(range)}
                disabled={isLoadingCalendar || !googleConnection.isConnected}
                className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 ${
                  selectedCalendarRange === range
                    ? 'bg-purple-500/30 border border-purple-400/50 text-white'
                    : 'bg-purple-500/10 border border-purple-400/20 text-white/70 hover:bg-purple-500/20'
                }`}
              >
                {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'Next Week'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Loading state */}
        {isLoadingCalendar && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
              </div>
              <span className="text-purple-300 text-sm">Loading events...</span>
            </div>
          </div>
        )}
        
        {/* Calendar Events */}
        {!isLoadingCalendar && calendarEvents.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            <div className="text-white/60 text-xs mb-2">
              {calendarEvents.length} event{calendarEvents.length !== 1 ? 's' : ''} found
            </div>
            {calendarEvents.map((event) => (
              <div
                key={event.id}
                className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-white/90 text-sm font-medium truncate">
                      {event.summary}
                    </div>
                    <div className="text-purple-300 text-xs mt-1">
                      {formatEventTime(event)}
                    </div>
                    {event.location && (
                      <div className="text-white/60 text-xs mt-1 truncate">
                        📍 {event.location}
                      </div>
                    )}
                    {event.attendees && event.attendees.length > 1 && (
                      <div className="text-white/60 text-xs mt-1">
                        👥 {event.attendees.length} attendees
                      </div>
                    )}
                  </div>
                  {event.htmlLink && (
                    <button
                      onClick={() => {
                        console.log('Opening event in browser:', event.htmlLink)
                      }}
                      className="ml-2 px-2 py-1 bg-purple-500/30 hover:bg-purple-500/50 rounded text-xs text-white transition-colors"
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* No events */}
        {!isLoadingCalendar && calendarEvents.length === 0 && (
          <div className="text-center text-white/60 py-4">
            <div className="text-2xl mb-2">📅</div>
            <div>No events found for {selectedCalendarRange === 'today' ? 'today' : selectedCalendarRange === 'week' ? 'this week' : 'next week'}</div>
            <div className="text-sm mt-1">Your schedule is clear!</div>
          </div>
        )}
        
        {/* Create Event Form */}
        {showCreateEventForm && (
          <div className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium text-sm">Create New Event</h4>
              <button
                onClick={() => setShowCreateEventForm(false)}
                className="text-purple-300 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="block text-white/70 text-xs mb-1">Event Title *</label>
                <input
                  type="text"
                  value={newEvent.summary}
                  onChange={(e) => setNewEvent((prev: any) => ({ ...prev, summary: e.target.value }))}
                  placeholder="Meeting with team"
                  className="w-full bg-purple-500/10 border border-purple-400/20 rounded px-2 py-1.5 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400/50"
                />
              </div>
              
              <button
                onClick={handleCreateEvent}
                disabled={isCreatingEvent || !newEvent.summary?.trim()}
                className="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/30 disabled:cursor-not-allowed text-white rounded text-sm transition-colors font-medium"
              >
                {isCreatingEvent ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </div>
        )}
        
        <div className="pt-2 border-t border-purple-500/10 space-y-2">
          {!showCreateEventForm && (
            <button
              onClick={() => setShowCreateEventForm(true)}
              className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded text-sm text-white transition-colors"
            >
              ➕ Create New Event
            </button>
          )}
          <button
            onClick={() => setCurrentMode('chat')}
            className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded text-sm text-white transition-colors"
          >
            💬 Ask about your schedule
          </button>
        </div>
      </div>
    </div>
  )
}