import React from 'react'
import type { Place } from '../../electron/preload'

interface MapsModeProps {
  places: Place[]
  isSearchingMaps: boolean
  userLocation: { lat: number; lng: number } | null
  setUserLocation: (loc: { lat: number; lng: number }) => void
  setCurrentMode: (mode: string) => void
  setInputValue: (val: string) => void
}

const MapsMode: React.FC<MapsModeProps> = ({
  places,
  isSearchingMaps,
  userLocation,
  setUserLocation,
  setCurrentMode,
  setInputValue
}) => {
  // ... Copy Maps mode JSX from App.tsx here, replacing state/handlers with props ...
  return (
    // ... maps mode JSX ...
    <></>
  )
}

export default MapsMode 