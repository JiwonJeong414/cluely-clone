import React, { useCallback, useEffect } from 'react'
import { useAppState } from './hooks/useAppState'
import { AuthButton } from './components/AuthButton'
import { MapVisualization } from './components/MapVisualization'
import { PlacesList } from './components/PlacesList'
import { AudioButton } from './components/AudioButton'

// Extend CSS properties to include webkit-specific properties
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}

function App() {
  // Get all state and handlers from the custom hook
  const app = useAppState()

  // Update dimensions when content changes
  useEffect(() => {
    app.updateDimensions()
  }, [app.currentResponse, app.streamingText, app.places, app.calendarEvents, app.currentMode])

  // Handle audio processed
  const handleAudioProcessed = async (transcription: string) => {
    app.handleAudioProcessed(transcription)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between" style={{ WebkitAppRegion: 'drag' }}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <h1 className="text-lg font-semibold">Wingman</h1>
        </div>
        
        <div className="flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' }}>
          <AudioButton onAudioProcessed={handleAudioProcessed} />
          <AuthButton 
            user={app.user}
            googleConnection={app.googleConnection}
            onSignIn={app.handleSignIn}
            onSignOut={app.handleSignOut}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex" ref={app.contentRef}>
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Mode Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              <button
                onClick={() => app.setCurrentMode('chat')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  app.currentMode === 'chat' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                💬 Chat
              </button>
              <button
                onClick={() => app.setCurrentMode('drive')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  app.currentMode === 'drive' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                📁 Drive
              </button>
              <button
                onClick={() => app.setCurrentMode('calendar')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  app.currentMode === 'calendar' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                📅 Calendar
              </button>
              <button
                onClick={() => app.setCurrentMode('maps')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  app.currentMode === 'maps' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                🗺️ Maps
              </button>
            </div>
          </nav>

          {/* Status */}
          <div className="p-4 border-t border-gray-200">
            {app.user ? (
              <div className="text-sm text-gray-600">
                <div className="font-medium">{app.user.email}</div>
                {app.googleConnection.isConnected && (
                  <div className="text-green-600 text-xs mt-1">✓ Google Connected</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">Not signed in</div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Mode-specific content */}
          {app.currentMode === 'chat' && (
            <div className="flex-1 flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
                {app.currentResponse && (
                  <div className="mb-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-medium">W</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-500 mb-1">
                            {app.currentResponse.timestamp.toLocaleTimeString()}
                          </div>
                          <div className="prose prose-sm max-w-none">
                            {app.currentResponse.hasScreenshot && app.currentResponse.screenshotUrl && (
                              <div className="mb-3">
                                <img 
                                  src={app.currentResponse.screenshotUrl} 
                                  alt="Screenshot" 
                                  className="max-w-full h-auto rounded border"
                                />
                              </div>
                            )}
                            <div className="whitespace-pre-wrap">{app.currentResponse.content}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {app.isStreaming && app.streamingText && (
                  <div className="mb-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-medium">W</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-500 mb-1">
                            {new Date().toLocaleTimeString()}
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap">{app.streamingText}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Map visualization for location queries */}
                {app.lastQueryWasLocation && app.places.length > 0 && (
                  <div className="mb-4">
                    <MapVisualization 
                      places={app.places} 
                      userLocation={app.userLocation || undefined}
                      isSearching={app.isSearchingMaps}
                    />
                  </div>
                )}

                {/* Drive search results */}
                {app.searchResults.length > 0 && (
                  <div className="mb-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm border">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Relevant Documents</h3>
                      <div className="space-y-2">
                        {app.searchResults.slice(0, 3).map((result, index) => (
                          <div key={index} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                            <div className="font-medium">{result.fileName}</div>
                            <div className="text-xs text-gray-500">{result.content.substring(0, 150)}...</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={app.handleSubmit} className="flex space-x-2">
                  <input
                    ref={app.inputRef}
                    type="text"
                    value={app.inputValue}
                    onChange={(e) => app.setInputValue(e.target.value)}
                    placeholder="Ask me anything..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={app.isLoading || app.isStreaming}
                  />
                  <button
                    type="submit"
                    disabled={!app.inputValue.trim() || app.isLoading || app.isStreaming}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {app.isLoading || app.isStreaming ? '...' : 'Send'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {app.currentMode === 'drive' && (
            <div className="flex-1 p-4">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Google Drive</h2>
                
                {/* Sync Status */}
                <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
                  <h3 className="text-lg font-semibold mb-4">Sync Status</h3>
                  
                  {app.syncProgress && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Syncing files...</span>
                        <span>{app.syncProgress.processedFiles || 0}/{app.syncProgress.totalFiles || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((app.syncProgress.processedFiles || 0) / (app.syncProgress.totalFiles || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={app.handleQuickSync}
                      disabled={app.isSyncing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Quick Sync
                    </button>
                    <button
                      onClick={app.handleDeepSync}
                      disabled={app.isSyncing}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                    >
                      Deep Sync
                    </button>
                    <button
                      onClick={app.handleForceSync}
                      disabled={app.isSyncing}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Force Sync
                    </button>
                  </div>
                </div>

                {/* Sync Stats */}
                {app.syncStats && (
                  <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
                    <h3 className="text-lg font-semibold mb-4">Sync Statistics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{app.syncStats.totalFiles || 0}</div>
                        <div className="text-sm text-gray-600">Total Files</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{app.syncStats.syncedFiles || 0}</div>
                        <div className="text-sm text-gray-600">Synced</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{app.syncStats.pendingFiles || 0}</div>
                        <div className="text-sm text-gray-600">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{app.syncStats.failedFiles || 0}</div>
                        <div className="text-sm text-gray-600">Failed</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {app.currentMode === 'calendar' && (
            <div className="flex-1 p-4">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Google Calendar</h2>
                
                {/* Calendar Range Selector */}
                <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Events</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => app.handleCalendarRangeChange('today')}
                        className={`px-3 py-1 rounded text-sm ${
                          app.selectedCalendarRange === 'today' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => app.handleCalendarRangeChange('week')}
                        className={`px-3 py-1 rounded text-sm ${
                          app.selectedCalendarRange === 'week' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        This Week
                      </button>
                      <button
                        onClick={() => app.handleCalendarRangeChange('next-week')}
                        className={`px-3 py-1 rounded text-sm ${
                          app.selectedCalendarRange === 'next-week' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Next Week
                      </button>
                    </div>
                  </div>

                  {/* Events List */}
                  <div className="space-y-3">
                    {app.isLoadingCalendar ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500">Loading events...</div>
                      </div>
                    ) : app.calendarEvents.length > 0 ? (
                      app.calendarEvents.map((event, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{event.summary}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {new Date(event.start.dateTime || event.start.date || '').toLocaleString()}
                              </p>
                              {event.location && (
                                <p className="text-sm text-gray-600 mt-1">📍 {event.location}</p>
                              )}
                              {event.description && (
                                <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                              )}
                            </div>
                            {event.htmlLink && (
                              <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-500">No events found</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Create Event Form */}
                <div className="bg-white rounded-lg p-6 shadow-sm border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Create Event</h3>
                    <button
                      onClick={() => app.setShowCreateEventForm(!app.showCreateEventForm)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {app.showCreateEventForm ? 'Cancel' : 'New Event'}
                    </button>
                  </div>

                  {app.showCreateEventForm && (
                    <form onSubmit={(e) => { e.preventDefault(); app.handleCreateEvent(); }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={app.newEvent.summary}
                          onChange={(e) => app.setNewEvent({ ...app.newEvent, summary: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={app.newEvent.description}
                          onChange={(e) => app.setNewEvent({ ...app.newEvent, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={app.newEvent.startDate}
                            onChange={(e) => app.setNewEvent({ ...app.newEvent, startDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={app.newEvent.startTime}
                            onChange={(e) => app.setNewEvent({ ...app.newEvent, startTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                          <input
                            type="date"
                            value={app.newEvent.endDate}
                            onChange={(e) => app.setNewEvent({ ...app.newEvent, endDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                          <input
                            type="time"
                            value={app.newEvent.endTime}
                            onChange={(e) => app.setNewEvent({ ...app.newEvent, endTime: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                          type="text"
                          value={app.newEvent.location}
                          onChange={(e) => app.setNewEvent({ ...app.newEvent, location: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Attendees (comma-separated emails)</label>
                        <input
                          type="text"
                          value={app.newEvent.attendees}
                          onChange={(e) => app.setNewEvent({ ...app.newEvent, attendees: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="user1@example.com, user2@example.com"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={app.isCreatingEvent}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {app.isCreatingEvent ? 'Creating...' : 'Create Event'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {app.currentMode === 'maps' && (
            <div className="flex-1 p-4">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Maps & Location</h2>
                
                {/* Map Visualization */}
                {app.places.length > 0 && (
                  <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
                    <h3 className="text-lg font-semibold mb-4">Nearby Places</h3>
                    <MapVisualization 
                      places={app.places} 
                      userLocation={app.userLocation || undefined}
                      isSearching={app.isSearchingMaps}
                    />
                  </div>
                )}

                {/* Places List */}
                {app.places.length > 0 && (
                  <div className="bg-white rounded-lg p-6 shadow-sm border">
                    <h3 className="text-lg font-semibold mb-4">Places</h3>
                    <PlacesList places={app.places} />
                  </div>
                )}

                {app.places.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-500">Search for places in the chat to see them here</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {app.docsNotification && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
          app.docsNotification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {app.docsNotification.message}
        </div>
      )}
    </div>
  )
}

export default App