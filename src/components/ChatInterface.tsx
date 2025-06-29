import React, { useState, useRef } from 'react'
import { getOpenAI } from '../api/openai'
import { type ChatMessage } from '../types'
import { MapVisualization } from './MapVisualization'
import { PlacesList } from './PlacesList'
import { ChatInput } from './ChatInput'
import { WelcomeContent } from './WelcomeContent'
import type { Message, PendingCapture } from '../types/app'
import type { User, GoogleConnection, Place } from '../../electron/preload'
import type { ChatInterfaceProps } from '../types/components'

/** Main chat interface that handles AI conversations, displays responses, and manages message history. */
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  user,
  googleConnection,
  places,
  setPlaces,
  userLocation,
  setUserLocation,
  pendingCapture,
  setPendingCapture,
  isSearchingMaps,
  setIsSearchingMaps,
  lastQueryWasLocation,
  setLastQueryWasLocation,
  searchResults,
  handleCreateEventFromChat,
  showDocsNotification,
  requestLocationPermission,
  updateDimensions
}) => {
  const [currentResponse, setCurrentResponse] = useState<Message | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sendMessage = async (
    userMessage: string, 
    screenshotDataUrl?: string, 
    driveContext?: any[], 
    calendarContext?: string
  ) => {
    // Handle pending captures
    let finalMessage = userMessage
    let finalScreenshot = screenshotDataUrl
    let audioTranscription: string | null = null
    
    if (pendingCapture) {
      if (pendingCapture.type === 'screenshot') {
        finalScreenshot = pendingCapture.data
        finalMessage = `${userMessage}\n\n[Screenshot captured at ${pendingCapture.timestamp.toLocaleTimeString()}]`
      } else if (pendingCapture.type === 'audio') {
        audioTranscription = pendingCapture.data
        finalMessage = `${userMessage}\n\n[Audio transcription: "${pendingCapture.data}"]`
      }
      
      setPendingCapture(null)
    }

    // Check if this is a "notes" request
    const isNotesRequest = finalMessage.toLowerCase().includes('notes') || finalMessage.toLowerCase().includes('save this')

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: finalMessage,
      timestamp: new Date(),
      hasScreenshot: !!finalScreenshot,
      screenshotUrl: finalScreenshot,
      driveContext: finalScreenshot ? undefined : driveContext
    }

    setCurrentResponse(null)
    setStreamingText('')
    setIsLoading(true)
    setIsStreaming(true)

    try {
      // Handle notes creation
      if (isNotesRequest && googleConnection.isConnected && window.electronAPI?.docs) {
        // Create notes logic here
        return
      }

      const openai = getOpenAI()
      
      const systemPrompt = `You are Wingman, a helpful AI assistant with access to Google Drive documents and Google Calendar. 

Key capabilities:
- Access to user's calendar events, schedule analysis, and meeting insights
- Access to user's Google Drive documents for context
- Provide scheduling advice, meeting preparation tips, and time management suggestions
- Help identify conflicts, busy periods, and free time slots
- Suggest optimal timing for tasks based on calendar availability

When calendar information is provided, use it to give specific, actionable advice about time management, scheduling, and productivity. Consider travel time, meeting preparation needs, and workload distribution.

Be conversational, helpful, and proactive in offering scheduling and productivity insights.`
      
      let fullResponse = ''
      
      if (finalScreenshot) {
        await openai.analyzeScreenshotStream(
          finalScreenshot,
          (chunk: string) => {
            fullResponse += chunk
            setStreamingText(fullResponse)
            requestAnimationFrame(() => updateDimensions())
          },
          finalMessage
        )
      } else {
        const chatMessages: ChatMessage[] = [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: finalMessage
          }
        ]
        
        await openai.sendMessageStream(chatMessages, (chunk: string) => {
          fullResponse += chunk
          setStreamingText(fullResponse)
          requestAnimationFrame(() => updateDimensions())
        })
      }
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
        driveContext: finalScreenshot ? undefined : driveContext,
        calendarContext
      }

      setCurrentResponse(assistantMsg)
      setStreamingText('')
      setIsStreaming(false)
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setCurrentResponse(errorMsg)
      setStreamingText('')
      setIsStreaming(false)
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        inputRef.current?.focus()
        updateDimensions()
      }, 200)
    }
  }

  const handleAudioProcessed = async (transcription: string) => {
    setPendingCapture({
      type: 'audio',
      data: transcription,
      timestamp: new Date()
    })
    
    const audioMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `[Audio captured: "${transcription}"]`,
      timestamp: new Date()
    }
    
    setCurrentResponse(audioMessage)
    setStreamingText('')
    setIsStreaming(false)
  }

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