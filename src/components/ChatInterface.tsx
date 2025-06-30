import React, { useState, useRef } from 'react'
import { getOpenAI } from '../api/openai'
import { type ChatMessage } from '../types'
import { MapVisualization } from './MapVisualization'
import { PlacesList } from './PlacesList'
import { ChatInput } from './ChatInput'
import { WelcomeContent } from './WelcomeContent'
import { useChat } from '../hooks/useChat'
import type { Message} from '../types/app'
import type { User, GoogleConnection, Place } from '../../electron/preload'
import type { ChatInterfaceProps } from '../types/components'

/** Main chat interface that handles AI conversations, displays responses, and manages message history. */
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  user,
  googleConnection,
  places,
  setPlaces,
  userLocation,
  pendingCapture,
  setPendingCapture,
  isSearchingMaps,
  setIsSearchingMaps,
  updateDimensions
}) => {
  const {
    currentResponse,
    streamingText,
    isStreaming,
    isLoading,
    sendMessage
  } = useChat({
    user,
    googleConnection,
    pendingCapture,
    setPendingCapture,
    setPlaces,
    setIsSearchingMaps,
    updateDimensions
  })

  return (
    <>
      {/* Chat Input in Header */}
      <ChatInput 
        pendingCapture={pendingCapture} 
        onSubmit={sendMessage}
        disabled={isLoading || isStreaming}
      />

      {/* Messages */}
      {(streamingText || isStreaming || currentResponse || places.length > 0) && (
        <div className="px-4 md:px-8 py-4 bg-black/20 border-t border-blue-500/10 max-h-96 overflow-y-auto custom-scrollbar">
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
              
              {/* Calendar context */}
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
              
              {/* Drive context */}
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

          {/* Maps visualization */}
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
                  console.log('Selected place:', place.name)
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Welcome content */}
      {!currentResponse && !streamingText && !isStreaming && (
        <WelcomeContent 
          user={user}
          googleConnection={googleConnection}
          onSuggestionClick={(suggestion) => sendMessage(suggestion)}
        />
      )}
    </>
  )
}