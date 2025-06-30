import React, { useState, useRef } from 'react'
import { getOpenAI } from '../api/openai'
import { type ChatMessage } from '../types'
import { MapVisualization } from './MapVisualization'
import { PlacesList } from './PlacesList'
import { ChatInput } from './ChatInput'
import { WelcomeContent } from './WelcomeContent'
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
  const [currentResponse, setCurrentResponse] = useState<Message | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (
    userMessage: string, 
    screenshotDataUrl?: string, 
    driveContext?: any[], 
    calendarContext?: string
  ) => {
    // Check if we have a pending capture and combine with user message
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
      
      // Clear the pending capture
      setPendingCapture(null)
    }

    // Check if this is a "notes" request early
    const isNotesRequest = finalMessage.toLowerCase().includes('notes') || finalMessage.toLowerCase().includes('save this')

    setCurrentResponse(null)
    setStreamingText('')
    setIsLoading(true)
    setIsStreaming(true)

    try {
      // If this is a notes request, skip AI analysis and just create the note
      if (isNotesRequest && googleConnection.isConnected && window.electronAPI?.docs) {
        try {
          if (finalScreenshot) {
            // For screenshots, we still want AI analysis in the note
            const openai = getOpenAI()
            let screenshotAnalysis = ''
            
            // Get AI analysis of the screenshot
            await openai.analyzeScreenshotStream(
              finalScreenshot,
              (chunk: string) => {
                screenshotAnalysis += chunk
              },
              finalMessage
            )
            
            // Create screenshot note with actual AI analysis
            const title = `Screenshot Analysis - ${new Date().toLocaleDateString()}`
            await window.electronAPI.docs.createScreenshotNote(
              title,
              finalScreenshot,
              screenshotAnalysis,
              finalMessage
            )
            console.log('Screenshot note created in Google Docs')
          } else if (audioTranscription) {
            // For audio, we want AI analysis of the transcription content
            const openai = getOpenAI()
            let audioAnalysis = ''
            
            // Get AI analysis of the audio transcription
            const chatMessages: ChatMessage[] = [
              {
                role: 'system',
                content: 'You are an AI assistant analyzing audio transcriptions. Provide insights, context, and analysis of the spoken content. Be helpful and actionable in your analysis.'
              },
              {
                role: 'user',
                content: `Please analyze this audio transcription and provide insights: "${audioTranscription}"`
              }
            ]
            
            await openai.sendMessageStream(chatMessages, (chunk: string) => {
              audioAnalysis += chunk
            })
            
            // Create audio note with actual AI analysis
            const title = `Audio Note - ${new Date().toLocaleDateString()}`
            await window.electronAPI.docs.createAudioNote(
              title,
              audioTranscription,
              audioAnalysis,
              0 // Duration not available
            )
            console.log('Audio note created in Google Docs')
          } else {
            // Create conversation note
            const title = `Conversation Note - ${new Date().toLocaleDateString()}`
            await window.electronAPI.docs.createConversationNote(
              title,
              `User: ${finalMessage}\n\nWingman: Note saved to Google Docs`,
              "Note saved to Google Docs"
            )
            console.log('Conversation note created in Google Docs')
          }
          
          // Show simple "Google notes created!" response
          const assistantMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Google notes created!',
            timestamp: new Date(),
            driveContext: finalScreenshot ? undefined : driveContext,
            calendarContext
          }
          
          setCurrentResponse(assistantMsg)
          setStreamingText('')
          setIsStreaming(false)
          
        } catch (error) {
          console.error('Failed to create note:', error)
          
          const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Failed to create Google notes. Please try again.',
            timestamp: new Date()
          }
          setCurrentResponse(errorMsg)
          setStreamingText('')
          setIsStreaming(false)
        }
        return // Exit early for notes requests
      }

      // Check if this is a drive search request
      const isDriveSearch = googleConnection.isConnected && 
        (finalMessage.toLowerCase().includes('drive') || 
         finalMessage.toLowerCase().includes('document') || 
         finalMessage.toLowerCase().includes('file') ||
         finalMessage.toLowerCase().includes('swift') ||
         finalMessage.toLowerCase().includes('search'))

      // Check if this is a location/maps search request
      const isLocationQuery = finalMessage.toLowerCase().includes('near me') || 
        finalMessage.toLowerCase().includes('nearby') ||
        finalMessage.toLowerCase().includes('coffee') ||
        finalMessage.toLowerCase().includes('restaurant') ||
        finalMessage.toLowerCase().includes('gas station') ||
        finalMessage.toLowerCase().includes('hospital') ||
        finalMessage.toLowerCase().includes('pharmacy') ||
        finalMessage.toLowerCase().includes('bank') ||
        finalMessage.toLowerCase().includes('atm') ||
        finalMessage.toLowerCase().includes('hotel') ||
        finalMessage.toLowerCase().includes('parking')

      let driveSearchResults: any[] = []
      
      // Perform drive search if needed
      if (isDriveSearch && window.electronAPI?.drive) {
        try {
          console.log('Searching drive for:', finalMessage)
          const searchResult = await window.electronAPI.drive.search(finalMessage, 5)
          if (searchResult.success && searchResult.results) {
            driveSearchResults = searchResult.results
            console.log(`[✓] Found ${driveSearchResults.length} relevant documents`)
          }
        } catch (error) {
          console.error('Drive search error:', error)
        }
      }

      // Perform maps search if needed
      if (isLocationQuery && window.electronAPI?.maps) {
        try {
          console.log('Searching maps for:', finalMessage)
          setIsSearchingMaps(true)
          
          const searchResult = await window.electronAPI.maps.search(finalMessage)
          if (searchResult.success && searchResult.places) {
            setPlaces(searchResult.places)
            console.log(`[✓] Found ${searchResult.places.length} places`)
          } else {
            console.error('Maps search failed:', searchResult.error)
          }
        } catch (error) {
          console.error('Maps search error:', error)
        } finally {
          setIsSearchingMaps(false)
        }
      }

      const openai = getOpenAI()
      
      // Build enhanced system prompt with calendar awareness
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
        // Use vision API with calendar context
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
        // Regular text chat with enhanced context
        const chatMessages: ChatMessage[] = [
          {
            role: 'system',
            content: systemPrompt
          }
        ]

        // Add drive context if we have search results
        if (driveSearchResults.length > 0) {
          const driveContext = `Here are relevant documents from your Google Drive:\n\n${driveSearchResults.map((doc, idx) => 
            `${idx + 1}. ${doc.fileName} - ${doc.content?.substring(0, 200)}...`
          ).join('\n\n')}`
          
          chatMessages.push({
            role: 'user',
            content: `Drive Context: ${driveContext}\n\nUser Question: ${finalMessage}`
          })
        } else {
          chatMessages.push({
            role: 'user',
            content: finalMessage
          })
        }
        
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
        driveContext: finalScreenshot ? undefined : driveSearchResults,
        calendarContext // Add calendar context to message
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
        updateDimensions()
      }, 200)
    }
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