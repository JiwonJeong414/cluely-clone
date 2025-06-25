// src/components/MapVisualization.tsx
import React, { useState, useEffect, useRef } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import type { Place } from '../services/maps/MapsService'

interface MapVisualizationProps {
  places: Place[]
  isSearching: boolean
  userLocation?: { lat: number; lng: number }
  className?: string
}

interface MarkerInfo extends Place {
  isOpen: boolean
}

interface PlacesListProps {
  places: Place[]
  onPlaceSelect?: (place: Place) => void
  className?: string
}

export const MapVisualization: React.FC<MapVisualizationProps> = ({
  places,
  isSearching,
  userLocation,
  className = ''
}) => {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(() => {
    // Default to user location or Rancho Santa Margarita, CA
    return userLocation || { lat: 33.6065, lng: -117.4975 }
  })
  const [mapZoom, setMapZoom] = useState<number>(13)

  // Update map center when user location changes
  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation)
    }
  }, [userLocation])

  // Adjust map view when places change
  useEffect(() => {
    if (places.length > 0) {
      // If we have places, adjust zoom based on spread
      if (places.length === 1) {
        setMapCenter(places[0].location)
        setMapZoom(15)
      } else {
        // Calculate bounds for multiple places
        const bounds = {
          north: Math.max(...places.map(p => p.location.lat)),
          south: Math.min(...places.map(p => p.location.lat)),
          east: Math.max(...places.map(p => p.location.lng)),
          west: Math.min(...places.map(p => p.location.lng))
        }
        
        // Calculate center and appropriate zoom
        const centerLat = (bounds.north + bounds.south) / 2
        const centerLng = (bounds.east + bounds.west) / 2
        setMapCenter({ lat: centerLat, lng: centerLng })
        
        // Adjust zoom based on span
        const latSpan = bounds.north - bounds.south
        const lngSpan = bounds.east - bounds.west
        const maxSpan = Math.max(latSpan, lngSpan)
        
        if (maxSpan < 0.01) setMapZoom(16)
        else if (maxSpan < 0.05) setMapZoom(14)
        else if (maxSpan < 0.1) setMapZoom(13)
        else if (maxSpan < 0.5) setMapZoom(11)
        else setMapZoom(10)
      }
    }
  }, [places])

  const handleMarkerClick = (placeId: string) => {
    setSelectedMarker(selectedMarker === placeId ? null : placeId)
  }

  const handleMapClick = () => {
    setSelectedMarker(null)
  }

  const formatRating = (rating?: number) => {
    if (!rating) return 'No rating'
    return `${'⭐'.repeat(Math.floor(rating))} ${rating.toFixed(1)}`
  }

  const formatPriceLevel = (priceLevel?: number) => {
    if (!priceLevel) return ''
    return '$'.repeat(priceLevel)
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`bg-red-500/10 border border-red-400/20 rounded-lg p-4 ${className}`}>
        <div className="text-red-300 text-sm">
          ❌ Google Maps API key not configured
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-black/40 backdrop-blur-sm border border-green-400/20 rounded-lg overflow-hidden ${className}`}>
      {/* Map Header */}
      <div className="px-3 py-2 bg-green-500/10 border-b border-green-400/20">
        <div className="flex items-center justify-between">
          <div className="text-green-300 text-sm font-medium">
            🗺️ Map View
          </div>
          <div className="text-green-300/70 text-xs">
            {isSearching ? 'Searching...' : `${places.length} places`}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin"></div>
              <span className="text-green-300 text-sm">Finding places...</span>
            </div>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative h-80">
        <APIProvider 
          apiKey={process.env.GOOGLE_MAPS_API_KEY}
          onLoad={() => console.log('🗺️ Maps API loaded successfully')}
        >
          <Map
            style={{ width: '100%', height: '100%' }}
            defaultCenter={mapCenter}
            defaultZoom={mapZoom}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapId="DEMO_MAP_ID"
            onClick={handleMapClick}
            styles={[
              {
                stylers: [
                  { saturation: -100 },
                  { lightness: -20 }
                ]
              }
            ]}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
          >
            {/* User Location Marker */}
            {userLocation && (
              <AdvancedMarker
                position={userLocation}
                title="Your Location"
              >
                <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg animate-pulse"></div>
              </AdvancedMarker>
            )}

            {/* Place Markers */}
            {places.map((place) => (
              <AdvancedMarker
                key={place.placeId}
                position={place.location}
                title={place.name}
                clickable={true}
                onClick={() => handleMarkerClick(place.placeId)}
              >
                <div className={`relative cursor-pointer transition-transform hover:scale-110 ${
                  selectedMarker === place.placeId ? 'scale-125 z-10' : ''
                }`}>
                  <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold ${
                    place.rating && place.rating >= 4.5 ? 'bg-green-500' :
                    place.rating && place.rating >= 4.0 ? 'bg-yellow-500' :
                    place.rating && place.rating >= 3.0 ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}>
                    {place.types.includes('restaurant') ? '🍽️' :
                     place.types.includes('cafe') ? '☕' :
                     place.types.includes('gas_station') ? '⛽' :
                     place.types.includes('hospital') ? '🏥' :
                     place.types.includes('pharmacy') ? '💊' :
                     place.types.includes('bank') ? '🏦' :
                     place.types.includes('lodging') ? '🏨' :
                     '📍'}
                  </div>
                  
                  {selectedMarker === place.placeId && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2">
                      <div className="bg-black/90 border border-green-400/30 rounded-lg p-3 shadow-xl min-w-64 max-w-80">
                        <div className="text-white font-medium text-sm mb-1 truncate">
                          {place.name}
                        </div>
                        
                        <div className="text-white/70 text-xs mb-2 line-clamp-2">
                          {place.address}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs">
                          {place.rating && (
                            <div className="text-yellow-300">
                              {formatRating(place.rating)}
                            </div>
                          )}
                          
                          {place.priceLevel && (
                            <div className="text-green-300">
                              {formatPriceLevel(place.priceLevel)}
                            </div>
                          )}
                        </div>
                        
                        {(place.distance || place.duration) && (
                          <div className="flex items-center gap-3 text-xs mt-2 pt-2 border-t border-white/10">
                            {place.distance && (
                              <div className="text-blue-300">
                                📍 {place.distance}
                              </div>
                            )}
                            {place.duration && (
                              <div className="text-purple-300">
                                ⏱️ {place.duration}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Phone and Website */}
                        {(place.phoneNumber || place.website) && (
                          <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                            {place.phoneNumber && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(`tel:${place.phoneNumber}`, '_blank')
                                }}
                                className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded text-xs text-blue-300 transition-colors"
                              >
                                📞 Call
                              </button>
                            )}
                            {place.website && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(place.website, '_blank')
                                }}
                                className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded text-xs text-green-300 transition-colors"
                              >
                                🌐 Visit
                              </button>
                            )}
                          </div>
                        )}
                        
                        {/* Arrow pointing to marker */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>
      </div>

      {/* Map Controls */}
      <div className="px-3 py-2 bg-green-500/5 border-t border-green-400/10">
        <div className="flex items-center justify-between text-xs">
          <div className="text-green-300/70">
            Click markers for details
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-blue-300">You</span>
            <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
            <span className="text-green-300">Places</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const PlacesList: React.FC<PlacesListProps> = ({
  places,
  onPlaceSelect,
  className = ''
}) => {
  const formatRating = (rating?: number) => {
    if (!rating) return ''
    return `⭐ ${rating.toFixed(1)}`
  }

  const getPlaceIcon = (types: string[]) => {
    if (types.includes('restaurant')) return '🍽️'
    if (types.includes('cafe')) return '☕'
    if (types.includes('gas_station')) return '⛽'
    if (types.includes('hospital')) return '🏥'
    if (types.includes('pharmacy')) return '💊'
    if (types.includes('bank')) return '🏦'
    if (types.includes('lodging')) return '🏨'
    return '📍'
  }

  if (places.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-green-300 text-sm font-medium mb-2">
        📍 Nearby Places ({places.length})
      </div>
      
      <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
        {places.map((place: Place) => (
          <div
            key={place.placeId}
            onClick={() => onPlaceSelect?.(place)}
            className="bg-green-500/10 border border-green-400/20 rounded-lg p-2 cursor-pointer hover:bg-green-500/20 transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="text-lg flex-shrink-0 mt-0.5">
                {getPlaceIcon(place.types)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-white/90 text-sm font-medium truncate">
                  {place.name}
                </div>
                
                <div className="flex items-center gap-3 text-xs text-white/60 mt-1">
                  {place.rating && (
                    <span className="text-yellow-300">
                      {formatRating(place.rating)}
                    </span>
                  )}
                  
                  {place.distance && (
                    <span className="text-blue-300">
                      📍 {place.distance}
                    </span>
                  )}
                  
                  {place.duration && (
                    <span className="text-purple-300">
                      ⏱️ {place.duration}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}