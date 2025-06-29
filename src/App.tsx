import React, { useEffect, useRef } from 'react'
import { initializeOpenAI } from './api/openai'
import { AppHeader } from './components/AppHeader'
import { ChatInterface } from './components/ChatInterface'
import { ModeRenderer } from './components/ModeRenderer'
import { NotificationManager } from './components/NotificationManager'
import { useApp } from './hooks/useApp'
import { useAuth } from './hooks/useAuth'
import { useCalendar } from './hooks/useCalendar'
import { useDrive } from './hooks/useDrive'
import { useMaps } from './hooks/useMaps'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { usePendingCaptures } from './hooks/usePendingCaptures'
import type { AppMode } from './types/app'

declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}

function App() {
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Core app state and utilities
  const {
    appVersion,
    isInitialized,
    currentMode,
    setCurrentMode,
    isDragging,
    setIsDragging,
    updateDimensions,
    handleMouseDown
  } = useApp(contentRef)

  // Authentication state
  const {
    user,
    googleConnection,
    isAuthenticating,
    handleSignIn,
    handleSignOut
  } = useAuth()

  // Calendar functionality
  const {
    calendarEvents,
    selectedCalendarRange,
    isLoadingCalendar,
    showCreateEventForm,
    setShowCreateEventForm,
    newEvent,
    setNewEvent,
    isCreatingEvent,
    loadCalendarEvents,
    handleCalendarRangeChange,
    handleCreateEvent,
    handleCreateEventFromChat
  } = useCalendar(user, googleConnection)

  // Drive functionality
  const {
    syncProgress,
    syncStats,
    isSyncing,
    searchResults,
    cleanupCandidates,
    organizationClusters,
    isAnalyzing,
    handleSync,
    handleQuickSync,
    handleDeepSync,
    handleForceSync,
    refreshSyncStats,
    loadCleanupCandidates,
    handleDeleteFiles,
    analyzeForOrganization
  } = useDrive(user, googleConnection)

  // Maps functionality
  const {
    places,
    userLocation,
    selectedPlace,
    isSearchingMaps,
    lastQueryWasLocation,
    setUserLocation,
    setSelectedPlace,
    setPlaces,
    setIsSearchingMaps,
    setLastQueryWasLocation,
    requestLocationPermission
  } = useMaps()

  // Pending captures (audio/screenshot)
  const {
    pendingCapture,
    setPendingCapture,
    docsNotification,
    isCreatingNote,
    showDocsNotification
  } = usePendingCaptures(googleConnection)

  // Keyboard shortcuts
  useKeyboardShortcuts({
    currentMode,
    setCurrentMode,
    user,
    googleConnection,
    selectedCalendarRange,
    loadCalendarEvents
  })

  // Initialize OpenAI and app version
  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    if (apiKey) {
      initializeOpenAI(apiKey)
    }

    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(version => {
        // Set app version in your state management
        setTimeout(updateDimensions, 150)
      })
    }

    const initialTimeout = setTimeout(updateDimensions, 200)
    return () => clearTimeout(initialTimeout)
  }, [updateDimensions])

  return (
    <div 
      ref={contentRef}
      className={`bg-black/85 backdrop-blur-lg rounded-xl border border-blue-500/20 shadow-lg relative overflow-hidden transition-all duration-300 ${
        isDragging ? 'scale-105 shadow-xl' : ''
      } ${!isInitialized ? 'opacity-0' : 'opacity-100'}`}
      style={{ 
        width: 'fit-content', 
        height: 'fit-content',
        minWidth: currentMode === 'chat' ? '480px' : '500px',
        maxWidth: '700px',
        transformOrigin: 'center center'
      }}
    >
      {/* Header */}
      <AppHeader
        user={user}
        googleConnection={googleConnection}
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
        calendarEvents={calendarEvents}
        isDragging={isDragging}
        handleMouseDown={handleMouseDown}
        appVersion={appVersion}
        pendingCapture={pendingCapture}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isAuthenticating={isAuthenticating}
      />

      {/* Chat Interface */}
      {currentMode === 'chat' && (
        <div className="max-w-2xl mx-auto w-full px-4">
          <ChatInterface
            user={user}
            googleConnection={googleConnection}
            places={places}
            setPlaces={setPlaces}
            userLocation={userLocation}
            setUserLocation={setUserLocation}
            pendingCapture={pendingCapture}
            setPendingCapture={setPendingCapture}
            isSearchingMaps={isSearchingMaps}
            setIsSearchingMaps={setIsSearchingMaps}
            lastQueryWasLocation={lastQueryWasLocation}
            setLastQueryWasLocation={setLastQueryWasLocation}
            searchResults={searchResults}
            handleCreateEventFromChat={handleCreateEventFromChat}
            showDocsNotification={showDocsNotification}
            requestLocationPermission={requestLocationPermission}
            updateDimensions={updateDimensions}
          />
        </div>
      )}

      {/* Mode Content */}
      {currentMode !== 'chat' && (
        <ModeRenderer
          mode={currentMode}
          user={user}
          googleConnection={googleConnection}
          // Drive props
          syncProgress={syncProgress}
          syncStats={syncStats}
          isSyncing={isSyncing}
          cleanupCandidates={cleanupCandidates}
          organizationClusters={organizationClusters}
          isAnalyzing={isAnalyzing}
          handleQuickSync={handleQuickSync}
          handleDeepSync={handleDeepSync}
          handleForceSync={handleForceSync}
          setCurrentMode={setCurrentMode}
          loadCleanupCandidates={loadCleanupCandidates}
          handleDeleteFiles={handleDeleteFiles}
          analyzeForOrganization={analyzeForOrganization}
          // Calendar props
          calendarEvents={calendarEvents}
          selectedCalendarRange={selectedCalendarRange}
          isLoadingCalendar={isLoadingCalendar}
          showCreateEventForm={showCreateEventForm}
          setShowCreateEventForm={setShowCreateEventForm}
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          isCreatingEvent={isCreatingEvent}
          handleCalendarRangeChange={handleCalendarRangeChange}
          handleCreateEvent={handleCreateEvent}
          loadCalendarEvents={loadCalendarEvents}
          // Maps props
          places={places}
          userLocation={userLocation}
          selectedPlace={selectedPlace}
          isSearchingMaps={isSearchingMaps}
          setSelectedPlace={setSelectedPlace}
          requestLocationPermission={requestLocationPermission}
          // Auth props
          handleSignIn={handleSignIn}
          handleSignOut={handleSignOut}
        />
      )}

      {/* Notifications */}
      <NotificationManager
        docsNotification={docsNotification}
        isCreatingNote={isCreatingNote}
      />
    </div>
  )
}

export default App