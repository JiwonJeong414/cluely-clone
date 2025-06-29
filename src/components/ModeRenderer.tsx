import React from 'react'
import { DriveMode } from './modes/DriveMode'
import { CalendarMode } from './modes/CalendarMode'
import { MapsMode } from './modes/MapsMode'
import { ProfileMode } from './modes/ProfileMode'
import { CleanupMode } from './modes/CleanupMode'
import { OrganizeMode } from './modes/OrganizeMode'
import { AuthButton } from './AuthButton'
import type { AppMode, CalendarRange } from '../types/app'
import type { User, GoogleConnection, CalendarEvent, Place, SyncProgress } from '../../electron/preload'
import type { ModeRendererProps } from '../types/modes'

/** Renders different application modes (Drive, Calendar, Maps, etc.) based on current mode state. */
export const ModeRenderer: React.FC<ModeRendererProps> = ({
  mode,
  user,
  googleConnection,
  handleSignIn,
  handleSignOut,
  setCurrentMode,
  // Drive props
  syncProgress,
  syncStats,
  isSyncing,
  cleanupCandidates,
  organizationClusters,
  isAnalyzing,
  handleQuickSync,
  handleDeepSync,
  handleForceSync,
  loadCleanupCandidates,
  handleDeleteFiles,
  analyzeForOrganization,
  // Calendar props
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
  loadCalendarEvents,
  // Maps props
  places,
  userLocation,
  selectedPlace,
  isSearchingMaps,
  setSelectedPlace,
  requestLocationPermission
}) => {
  if (!user) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-white text-lg mb-4">Sign in to access Google Drive & Calendar</h3>
        <AuthButton
          user={user}
          googleConnection={googleConnection}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          className="mx-auto"
        />
      </div>
    )
  }

  switch (mode) {
    case 'drive':
      return (
        <DriveMode 
          user={user}
          googleConnection={googleConnection}
          syncProgress={syncProgress}
          syncStats={syncStats}
          isSyncing={isSyncing}
          handleQuickSync={handleQuickSync}
          handleDeepSync={handleDeepSync}
          handleForceSync={handleForceSync}
          setCurrentMode={setCurrentMode}
        />
      )
      
    case 'cleanup':
      return (
        <CleanupMode 
          user={user}
          googleConnection={googleConnection}
          cleanupCandidates={cleanupCandidates}
          loadCleanupCandidates={loadCleanupCandidates}
          handleDeleteFiles={handleDeleteFiles}
        />
      )
      
    case 'organize':
      return (
        <OrganizeMode 
          user={user}
          googleConnection={googleConnection}
          organizationClusters={organizationClusters}
          isAnalyzing={isAnalyzing}
          analyzeForOrganization={analyzeForOrganization}
        />
      )
      
    case 'calendar':
      return (
        <CalendarMode 
          user={user}
          googleConnection={googleConnection}
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
          setCurrentMode={setCurrentMode}
        />
      )
      
    case 'maps':
      return (
        <MapsMode 
          user={user}
          googleConnection={googleConnection}
          places={places}
          userLocation={userLocation}
          selectedPlace={selectedPlace}
          isSearchingMaps={isSearchingMaps}
          setSelectedPlace={setSelectedPlace}
          requestLocationPermission={requestLocationPermission}
          setCurrentMode={setCurrentMode}
        />
      )
      
    case 'profile':
      return (
        <ProfileMode 
          user={user}
          googleConnection={googleConnection}
          calendarEvents={calendarEvents}
          handleSignOut={handleSignOut}
          requestLocationPermission={requestLocationPermission}
        />
      )
      
    default:
      return null
  }
}