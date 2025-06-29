// src/components/PlacesList.tsx - Compact list view companion
import React from 'react'
import type { Place } from '../services/maps/MapsService'
import type { PlacesListProps } from '../types/components'

/** Compact list view of nearby places with ratings, distance, and quick access to place details. */
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
        {places.map((place) => (
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