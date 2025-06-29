import React from 'react'
import { MapVisualization } from '../MapVisualization'
import { PlacesList } from '../PlacesList'
import type { User, GoogleConnection, Place } from '../../../electron/preload'
import type { AppMode } from '../../types/app'
import type { MapsModeProps } from '../../types/modes'

/** Displays interactive maps and nearby places with location-based search and navigation. */
export const MapsMode: React.FC<MapsModeProps> = ({
  user,
  googleConnection,
  places,
  userLocation,
  selectedPlace,
  isSearchingMaps,
  setSelectedPlace,
  requestLocationPermission,
  setCurrentMode
}) => {
  return (
    <div className="space-y-4" style={{ WebkitAppRegion: 'no-drag' }}>
      {/* Maps Header */}
      <div className="px-4 pt-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">Maps & Locations</h3>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const location = await requestLocationPermission()
                console.log('Location updated:', location)
              }}
              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded transition-colors"
              title="Update location"
            >
              📍 Locate
            </button>
            <button
              onClick={() => setCurrentMode('chat')}
              className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs rounded transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Location Status */}
        <div className={`text-xs px-3 py-2 rounded-lg border mb-3 ${
          userLocation 
            ? 'bg-green-500/10 border-green-400/20 text-green-300'
            : 'bg-yellow-500/10 border-yellow-400/20 text-yellow-300'
        }`}>
          {userLocation 
            ? `📍 Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
            : '📍 Location access needed for accurate results'
          }
        </div>
      </div>

      {/* Map Visualization */}
      <div className="px-4">
        <MapVisualization
          places={places}
          isSearching={isSearchingMaps}
          userLocation={userLocation || undefined}
          className="mb-4"
          style={{ height: 250, maxHeight: 300 }}
        />
      </div>

      {/* Compact Places List */}
      <div className="px-4 pb-4">
        <PlacesList
          places={places}
          onPlaceSelect={(place: Place) => {
            setSelectedPlace(place)
            console.log('Selected place:', place.name)
          }}
        />
        
        {places.length === 0 && !isSearchingMaps && (
          <div className="text-center text-white/60 py-8">
            <div className="text-4xl mb-3">🗺️</div>
            <div>No places found</div>
            <div className="text-sm mt-2">
              Try asking "coffee shops near me" in chat mode
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setCurrentMode('chat')}
            className="p-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-400/30 rounded-lg text-white/80 text-sm transition-colors"
          >
            🍽️ Restaurants
          </button>
          <button
            onClick={() => setCurrentMode('chat')}
            className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 rounded-lg text-white/80 text-sm transition-colors"
          >
            ☕ Coffee
          </button>
          <button
            onClick={() => setCurrentMode('chat')}
            className="p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/30 rounded-lg text-white/80 text-sm transition-colors"
          >
            ⛽ Gas
          </button>
          <button
            onClick={() => setCurrentMode('chat')}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 rounded-lg text-white/80 text-sm transition-colors"
          >
            💊 Pharmacy
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="px-4 pb-4">
        <div className="text-xs text-white/40 space-y-1">
          <div>💡 <strong>Click markers</strong> on the map for details</div>
          <div>🔍 <strong>Search in chat:</strong> "coffee shops near me"</div>
          <div>📍 <strong>Enable location</strong> for accurate distances</div>
        </div>
      </div>
    </div>
  )
}