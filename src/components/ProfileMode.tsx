import React from 'react'
import type { User, GoogleConnection, CalendarEvent } from '../../electron/preload'

interface ProfileModeProps {
  user: User
  googleConnection: GoogleConnection
  calendarEvents: CalendarEvent[]
  onSignOut: () => void
  requestLocationPermission: () => Promise<{ lat: number; lng: number } | null>
}

const ProfileMode: React.FC<ProfileModeProps> = ({
  user,
  googleConnection,
  calendarEvents,
  onSignOut,
  requestLocationPermission
}) => {
  // ... Copy Profile mode JSX from App.tsx here, replacing state/handlers with props ...
  return (
    // ... profile mode JSX ...
    <></>
  )
}

export default ProfileMode 