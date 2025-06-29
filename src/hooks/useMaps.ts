import { useState } from 'react'
import type { Place } from '../../electron/preload'

export function useMaps() {
  const [places, setPlaces] = useState<Place[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [isSearchingMaps, setIsSearchingMaps] = useState(false)
  const [lastQueryWasLocation, setLastQueryWasLocation] = useState(false)

  const requestLocationPermission = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      console.log('🌍 Requesting location permission...')
      
      if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported')
        alert('Geolocation is not supported by this browser')
        return null
      }
      
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' })
          console.log('📍 Current location permission state:', permission.state)
          
          if (permission.state === 'denied') {
            alert('Location access is blocked. Please enable it in your browser settings and refresh the page.')
            return null
          }
        } catch (permError) {
          console.warn('Could not check permission state:', permError)
        }
      }
      
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Location request timed out'))
        }, 15000)
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId)
            console.log('✅ Location obtained:', {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            })
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            })
          },
          (error) => {
            clearTimeout(timeoutId)
            console.error('❌ Location error:', error)
            
            let message = 'Failed to get your location: '
            switch (error.code) {
              case error.PERMISSION_DENIED:
                message += 'Permission denied. Please allow location access and try again.'
                break
              case error.POSITION_UNAVAILABLE:
                message += 'Location unavailable. Please check your GPS or internet connection.'
                break
              case error.TIMEOUT:
                message += 'Request timed out. Please try again.'
                break
              default:
                message += error.message || 'Unknown error occurred'
            }
            
            alert(message)
            reject(new Error(message))
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000 // 5 minutes
          }
        )
      })
    } catch (error) {
      console.error('❌ Location permission error:', error)
      return null
    }
  }

  return {
    places,
    userLocation,
    selectedPlace,
    isSearchingMaps,
    lastQueryWasLocation,
    setPlaces,
    setUserLocation,
    setSelectedPlace,
    setIsSearchingMaps,
    setLastQueryWasLocation,
    requestLocationPermission
  }
}
