import React, { useRef } from 'react'
import { AudioButton } from './AudioButton'
import type { Place } from '../../electron/preload'

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

interface ChatInterfaceProps {
  inputValue: string
  setInputValue: (value: string) => void
  handleSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  isStreaming: boolean
  pendingCapture: any
  googleConnection: any
  streamingText: string
  currentResponse: Message | null
  places: Place[]
  isSearchingMaps: boolean
  userLocation: { lat: number; lng: number } | null
  selectedPlace: Place | null
  setSelectedPlace: (place: Place | null) => void
  MapVisualization: React.ComponentType<any>
  PlacesList: React.ComponentType<any>
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  inputValue,
  setInputValue,
  handleSubmit,
  isLoading,
  isStreaming,
  pendingCapture,
  googleConnection,
  streamingText,
  currentResponse,
  places,
  isSearchingMaps,
  userLocation,
  selectedPlace,
  setSelectedPlace,
  MapVisualization,
  PlacesList
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {/* Chat Input */}
      <div className="relative" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit(e))}
          placeholder={
            pendingCapture 
              ? (pendingCapture.type === 'screenshot' 
                  ? "Ask about the screen" 
                  : "Ask about the audio")
              : (googleConnection.isConnected ? "I'm your AI Wingman, request anything" : "Type a message...")
          }
          className="w-full bg-blue-500/10 border border-blue-400/20 rounded-lg px-4 py-3 pr-32 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-colors text-sm"
          disabled={isLoading || isStreaming}
          autoFocus
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          <AudioButton 
            onAudioProcessed={() => {}} // This will be handled by parent
            className="flex-shrink-0"
          />
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isLoading || isStreaming}
            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs transition-colors"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      {(streamingText || isStreaming || currentResponse || places.length > 0) && (
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
                    {currentResponse.calendarContext.split('\n').map((line: string, idx: number) => (
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
                    {currentResponse.driveContext.map((doc: any, idx: number) => (
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
                }}
              />
            </div>
          )}
        </div>
      )}
    </>
  )
} 