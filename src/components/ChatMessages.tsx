import React from 'react'
import { MapVisualization } from './MapVisualization'
import { PlacesList } from './PlacesList'
import type { Message, Place } from '../types/app'

interface ChatMessagesProps {
  streamingText: string
  isStreaming: boolean
  currentResponse: Message | null
  places: Place[]
  isSearchingMaps: boolean
  userLocation: { lat: number; lng: number } | null
  googleConnection: any
  setSelectedPlace: (place: Place) => void
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
  streamingText,
  isStreaming,
  currentResponse,
  places,
  isSearchingMaps,
  userLocation,
  googleConnection,
  setSelectedPlace
}) => {
  if (!streamingText && !isStreaming && !currentResponse && places.length === 0) {
    return null
  }

  return (
    <div className="px-6 py-4 bg-black/20 border-t border-blue-500/10 max-h-96 overflow-y-auto custom-scrollbar">
      {(streamingText || isStreaming) && (
        <div className="bg-blue-500/5 border border-blue-400/10 rounded-lg px-6 py-4">
          <div className="text-sm leading-relaxed space-y-3 text-white/90">
            {streamingText || (
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                </div>
                <span className="text-blue-300 text-sm font-medium">
                  {googleConnection.isConnected ? 'Generating Response...' : 'Analyzing...'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {currentResponse && !isStreaming && (
        <div className="bg-blue-500/5 border border-blue-400/10 rounded-lg px-6 py-4">
          <div className="text-sm leading-relaxed space-y-3 text-white/90">
            {currentResponse.content}
          </div>
          
          {/* Show Calendar context if available */}
          {currentResponse.calendarContext && (
            <div className="mt-4 pt-3 border-t border-purple-400/10">
              <div className="text-xs text-purple-300 mb-2">📅 Calendar Analysis:</div>
              <div className="text-xs text-white/70 bg-purple-500/5 border border-purple-400/10 rounded p-2 max-h-32 overflow-y-auto custom-scrollbar">
                {currentResponse.calendarContext.split('\n').map((line, idx) => (
                  <div key={idx} className="mb-1">{line}</div>
                ))}
              </div>
            </div>
          )}
          
          {/* Show Drive context if available */}
          {currentResponse.driveContext && currentResponse.driveContext.length > 0 && (
            <div className="mt-4 pt-3 border-t border-blue-400/10">
              <div className="text-xs text-blue-300 mb-2">📄 Referenced Documents:</div>
              <div className="space-y-1">
                {currentResponse.driveContext.map((doc, idx) => (
                  <div key={idx} className="text-xs text-white/60 truncate">
                    • {doc.fileName}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Always show MapVisualization and PlacesList if places exist */}
      {places.length > 0 && (
        <div className="mt-6">
          <MapVisualization
            places={places}
            isSearching={isSearchingMaps}
            userLocation={userLocation || undefined}
            className="mb-4"
          />
          <PlacesList
            places={places}
            onPlaceSelect={(place: Place) => {
              setSelectedPlace(place)
              // Optionally, you could set inputValue and switch to chat for more info
            }}
          />
        </div>
      )}
    </div>
  )
}

export default ChatMessages 