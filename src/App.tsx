import React, { useEffect, useState, useRef, useCallback } from 'react'
import { initializeOpenAI, getOpenAI, type ChatMessage } from './api/openai'
import type { User, GoogleConnection, SyncProgress, CleanupCandidate, OrganizationCluster, CalendarEvent, Place } from '../electron/preload'
import { AuthButton } from './components/AuthButton'
import { MapVisualization } from './components/MapVisualization'
import { PlacesList } from './components/PlacesList'
import { AudioButton } from './components/AudioButton'
import { useAppState } from './hooks/useAppState'
import { ChatInterface } from './components/ChatInterface'
import { DriveMode } from './components/DriveMode'
import { CalendarMode } from './components/CalendarMode'
import { MapsMode } from './components/MapsMode'
import { ProfileMode } from './components/ProfileMode'
import { CleanupMode } from './components/CleanupMode'
import { OrganizeMode } from './components/OrganizeMode'
import { WelcomeContent } from './components/WelcomeContent'
import {
  isCalendarQuery, isDriveQuery, isAudioQuery, isLocationQuery, isCalendarCreationQuery,
  parseCalendarCreationRequest, formatEventTime, requestLocationPermission, getSmartSuggestions
} from './utils/queryHelpers'
import type { AppMode } from './hooks/useAppState'

// Extend CSS properties to include webkit-specific properties
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: 'drag' | 'no-drag'
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  hasScreenshot?: boolean
  screenshotUrl?: string
  driveContext?: any[]
  calendarContext?: string
}

// Add new state for pending captures
interface PendingCapture {
  type: 'screenshot' | 'audio'
  data: string
  timestamp: Date
}

type CalendarRange = 'today' | 'week' | 'next-week'

function App() {
  const state = useAppState()
  const inputRef = useRef<HTMLInputElement>(null)

  // --- Handler implementations ---

  // Chat submit handler (replace with your sendMessage or handleSubmit logic)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Your chat logic here, e.g.:
    // await sendMessage(state.inputValue)
  }

  // Drive sync handlers
  const handleSync = async (options: { limit?: number, force?: boolean, strategy?: 'new_files_only' | 'force_reindex' } = {}) => {
    // Your sync logic here
  }
  const handleQuickSync = () => handleSync({ limit: 5, force: false })
  const handleDeepSync = () => handleSync({ limit: 20, force: false })
  const handleForceSync = () => handleSync({ limit: 10, force: true })

  // Calendar event loading
  const loadCalendarEvents = async (range: 'today' | 'week' | 'next-week') => {
    // Your calendar event loading logic here
  }
  const handleCalendarRangeChange = (range: 'today' | 'week' | 'next-week') => {
    loadCalendarEvents(range)
  }

  // Calendar event creation
  const handleCreateEvent = async () => {
    // Your create event logic here
  }

  // Sign out
  const handleSignOut = async () => {
    // Your sign out logic here
  }

  // Cleanup candidates
  const loadCleanupCandidates = async () => {
    // Your cleanup candidate loading logic here
  }
  const handleDeleteFiles = async (fileIds: string[]) => {
    // Your delete files logic here
  }

  // Organize
  const analyzeForOrganization = async () => {
    // Your analyze for organization logic here
  }

  // --- UI ---
  return (
    <div>
      {/* Header and mode switch UI here */}
      {/* ... */}

      {/* Main content by mode */}
      {state.currentMode === 'chat' && (
        <ChatInterface
          inputValue={state.inputValue}
          setInputValue={state.setInputValue}
          handleSubmit={handleSubmit}
          isLoading={state.isLoading}
          isStreaming={state.isStreaming}
          pendingCapture={state.pendingCapture}
          googleConnection={state.googleConnection}
          streamingText={state.streamingText}
          currentResponse={state.currentResponse}
          places={state.places}
          isSearchingMaps={state.isSearchingMaps}
          userLocation={state.userLocation}
          selectedPlace={state.selectedPlace}
          setSelectedPlace={state.setSelectedPlace}
          MapVisualization={MapVisualization}
          PlacesList={PlacesList}
        />
      )}
      {state.currentMode === 'drive' && (
        <DriveMode
          googleConnection={state.googleConnection}
          isSyncing={state.isSyncing}
          syncProgress={state.syncProgress}
          syncStats={state.syncStats}
          handleQuickSync={handleQuickSync}
          handleDeepSync={handleDeepSync}
          handleForceSync={handleForceSync}
          setCurrentMode={(mode: string) => state.setCurrentMode(mode as AppMode)}
        />
      )}
      {state.currentMode === 'calendar' && (
        <CalendarMode
          googleConnection={state.googleConnection}
          isLoadingCalendar={state.isLoadingCalendar}
          calendarEvents={state.calendarEvents}
          selectedCalendarRange={state.selectedCalendarRange}
          handleCalendarRangeChange={handleCalendarRangeChange}
          formatEventTime={formatEventTime}
          showCreateEventForm={state.showCreateEventForm}
          setShowCreateEventForm={state.setShowCreateEventForm}
          newEvent={state.newEvent}
          setNewEvent={state.setNewEvent}
          isCreatingEvent={state.isCreatingEvent}
          handleCreateEvent={handleCreateEvent}
          setCurrentMode={(mode: string) => state.setCurrentMode(mode as AppMode)}
        />
      )}
      {state.currentMode === 'maps' && (
        <MapsMode
          userLocation={state.userLocation}
          places={state.places}
          isSearchingMaps={state.isSearchingMaps}
          selectedPlace={state.selectedPlace}
          setSelectedPlace={state.setSelectedPlace}
          setCurrentMode={(mode: string) => state.setCurrentMode(mode as AppMode)}
          setInputValue={state.setInputValue}
          requestLocationPermission={requestLocationPermission}
          MapVisualization={MapVisualization}
          PlacesList={PlacesList}
        />
      )}
      {state.currentMode === 'profile' && (
        <ProfileMode
          user={state.user}
          googleConnection={state.googleConnection}
          calendarEvents={state.calendarEvents}
          formatEventTime={formatEventTime}
          handleSignOut={handleSignOut}
          requestLocationPermission={requestLocationPermission}
        />
      )}
      {state.currentMode === 'cleanup' && (
        <CleanupMode
          googleConnection={state.googleConnection}
          cleanupCandidates={state.cleanupCandidates}
          loadCleanupCandidates={loadCleanupCandidates}
          handleDeleteFiles={handleDeleteFiles}
        />
      )}
      {state.currentMode === 'organize' && (
        <OrganizeMode
          googleConnection={state.googleConnection}
          isAnalyzing={state.isAnalyzing}
          organizationClusters={state.organizationClusters}
          analyzeForOrganization={analyzeForOrganization}
          setOrganizationClusters={state.setOrganizationClusters}
        />
      )}
      {/* Welcome content for chat mode */}
      {state.currentMode === 'chat' && !state.currentResponse && !state.streamingText && !state.isStreaming && (
        <WelcomeContent
          user={state.user}
          googleConnection={state.googleConnection}
          appVersion={state.appVersion}
          getSmartSuggestions={getSmartSuggestions}
          setInputValue={state.setInputValue}
          inputRef={inputRef}
        />
      )}
    </div>
  )
}

export default App