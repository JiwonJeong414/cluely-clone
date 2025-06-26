import React from 'react'
import type { CalendarEvent } from '../../electron/preload'
import type { AppMode } from '../hooks/useAppState'

interface NewEvent {
  summary: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  location: string
  attendees: string
}

interface CalendarModeProps {
  googleConnection: any
  isLoadingCalendar: boolean
  calendarEvents: CalendarEvent[]
  selectedCalendarRange: 'today' | 'week' | 'next-week'
  handleCalendarRangeChange: (range: 'today' | 'week' | 'next-week') => void
  formatEventTime: (event: CalendarEvent) => string
  showCreateEventForm: boolean
  setShowCreateEventForm: (show: boolean) => void
  newEvent: NewEvent
  setNewEvent: (event: NewEvent | ((prev: NewEvent) => NewEvent)) => void
  isCreatingEvent: boolean
  handleCreateEvent: () => void
  setCurrentMode: (mode: AppMode) => void
}

export const CalendarMode: React.FC<CalendarModeProps> = (props) => {
  return (
    <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar" style={{ WebkitAppRegion: 'no-drag' } as any}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Calendar</h3>
          <div className="flex gap-1">
            {(['today', 'week', 'next-week'] as const).map((range) => (
              <button
                key={range}
                onClick={() => props.handleCalendarRangeChange(range)}
                disabled={props.isLoadingCalendar || !props.googleConnection.isConnected}
                className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 ${
                  props.selectedCalendarRange === range
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
        {props.isLoadingCalendar && (
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
        {!props.isLoadingCalendar && props.calendarEvents.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            <div className="text-white/60 text-xs mb-2">
              {props.calendarEvents.length} event{props.calendarEvents.length !== 1 ? 's' : ''} found
            </div>
            {props.calendarEvents.map((event) => (
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
                      {props.formatEventTime(event)}
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
                        // Open in external browser via Electron
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
        {!props.isLoadingCalendar && props.calendarEvents.length === 0 && (
          <div className="text-center text-white/60 py-4">
            <div className="text-2xl mb-2">📅</div>
            <div>No events found for {props.selectedCalendarRange === 'today' ? 'today' : props.selectedCalendarRange === 'week' ? 'this week' : 'next week'}</div>
            <div className="text-sm mt-1">Your schedule is clear!</div>
          </div>
        )}
        
        {/* Create Event Form */}
        {props.showCreateEventForm && (
          <div className="bg-purple-500/10 border border-purple-400/20 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium text-sm">Create New Event</h4>
              <button
                onClick={() => props.setShowCreateEventForm(false)}
                className="text-purple-300 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2">
              {/* Event Title */}
              <div>
                <label className="block text-white/70 text-xs mb-1">Event Title *</label>
                <input
                  type="text"
                  value={props.newEvent.summary}
                  onChange={(e) => props.setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Meeting with team"
                  className="w-full bg-purple-500/10 border border-purple-400/20 rounded px-2 py-1.5 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400/50"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-white/70 text-xs mb-1">Description</label>
                <textarea
                  value={props.newEvent.description}
                  onChange={(e) => props.setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full bg-purple-500/10 border border-purple-400/20 rounded px-2 py-1.5 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400/50 resize-none"
                />
              </div>
              
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-white/70 text-xs mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={props.newEvent.startDate}
                    onChange={(e) => props.setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-purple-500/10 border border-purple-400/20 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-400/50"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-xs mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={props.newEvent.startTime}
                    onChange={(e) => props.setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full bg-purple-500/10 border border-purple-400/20 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-400/50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-white/70 text-xs mb-1">End Date</label>
                  <input
                    type="date"
                    value={props.newEvent.endDate}
                    onChange={(e) => props.setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-purple-500/10 border border-purple-400/20 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-400/50"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-xs mb-1">End Time</label>
                  <input
                    type="time"
                    value={props.newEvent.endTime}
                    onChange={(e) => props.setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full bg-purple-500/10 border border-purple-400/20 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-400/50"
                  />
                </div>
              </div>
              
              {/* Location */}
              <div>
                <label className="block text-white/70 text-xs mb-1">Location</label>
                <input
                  type="text"
                  value={props.newEvent.location}
                  onChange={(e) => props.setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Office, Zoom, or address"
                  className="w-full bg-purple-500/10 border border-purple-400/20 rounded px-2 py-1.5 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400/50"
                />
              </div>
              
              {/* Attendees */}
              <div>
                <label className="block text-white/70 text-xs mb-1">Attendees</label>
                <input
                  type="text"
                  value={props.newEvent.attendees}
                  onChange={(e) => props.setNewEvent(prev => ({ ...prev, attendees: e.target.value }))}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full bg-purple-500/10 border border-purple-400/20 rounded px-2 py-1.5 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400/50"
                />
                <div className="text-white/50 text-xs mt-1">Separate multiple emails with commas</div>
              </div>
              
              {/* Create Button */}
              <button
                onClick={props.handleCreateEvent}
                disabled={props.isCreatingEvent || !props.newEvent.summary.trim() || !props.newEvent.startDate || !props.newEvent.startTime}
                className="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/30 disabled:cursor-not-allowed text-white rounded text-sm transition-colors font-medium"
              >
                {props.isCreatingEvent ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </div>
        )}
        
        <div className="pt-2 border-t border-purple-500/10 space-y-2">
          {!props.showCreateEventForm && (
            <button
              onClick={() => props.setShowCreateEventForm(true)}
              className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded text-sm text-white transition-colors"
            >
              ➕ Create New Event
            </button>
          )}
          <button
            onClick={() => props.setCurrentMode('chat')}
            className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 rounded text-sm text-white transition-colors"
          >
            💬 Ask about your schedule
          </button>
        </div>
      </div>
    </div>
  )
} 