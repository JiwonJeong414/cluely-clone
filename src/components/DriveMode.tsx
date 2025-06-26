import React from 'react'
import type { SyncProgress, GoogleConnection } from '../../electron/preload'

interface DriveModeProps {
  googleConnection: GoogleConnection
  isSyncing: boolean
  syncStats: any
  syncProgress: SyncProgress | null
  onQuickSync: () => void
  onDeepSync: () => void
  onForceSync: () => void
  setCurrentMode: (mode: string) => void
}

const DriveMode: React.FC<DriveModeProps> = ({
  googleConnection,
  isSyncing,
  syncStats,
  syncProgress,
  onQuickSync,
  onDeepSync,
  onForceSync,
  setCurrentMode
}) => {
  // ... Copy Drive mode JSX from App.tsx here, replacing state/handlers with props ...
  return (
    // ... drive mode JSX ...
    <></>
  )
}

export default DriveMode 