import { useState, useRef, useCallback } from 'react'
import { getOpenAI, type ChatMessage } from '../api/openai'
import { isCalendarQuery, isDriveQuery, isAudioQuery, isLocationQuery, isCalendarCreationQuery } from '../utils/queryHelpers'
import type { User, GoogleConnection, CalendarEvent, Place } from '../../electron/preload'

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

export function useChatHandlers(user: User | null, googleConnection: GoogleConnection) {
  const [currentResponse, setCurrentResponse] = useState<Message | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingCapture, setPendingCapture] = useState<any>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [isSearchingMaps, setIsSearchingMaps] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [lastQueryWasLocation, setLastQueryWasLocation] = useState(false)
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [docsNotification, setDocsNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [contextedMessages, setContextedMessages] = useState<string>('')

  // Google Docs functions
  const showDocsNotification = (type: 'success' | 'error', message: string) => {
    setDocsNotification({ type, message })
    setTimeout(() => setDocsNotification(null), 5000)
  }

  // Update dimensions when content changes
  const updateDimensions = useCallback(() => {
    // This will be provided by the parent component
    if (window.electronAPI?.updateContentDimensions) {
      requestAnimationFrame(() => {
        window.electronAPI.updateContentDimensions({ width: 0, height: 0 })
      })
    }
  }, [])

  // Send message with Drive context
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
        setContextedMessages(prev => prev + `\nAudio context: ${pendingCapture.data}`)
      }
      
      setPendingCapture(null)
    }

    // Check if this is a "notes" request early
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
    setInputValue('')

    try {
      // If this is a notes request, skip AI analysis and just create the note
      if (isNotesRequest && googleConnection.isConnected && window.electronAPI?.docs) {
        try {
          setIsCreatingNote(true)
          
          if (finalScreenshot) {
            const openai = getOpenAI()
            let screenshotAnalysis = ''
            
            await openai.analyzeScreenshotStream(
              finalScreenshot,
              (chunk: string) => {
                screenshotAnalysis += chunk
              },
              finalMessage
            )
            
            const title = `Screenshot Analysis - ${new Date().toLocaleDateString()}`
            await window.electronAPI.docs.createScreenshotNote(
              title,
              finalScreenshot,
              screenshotAnalysis,
              finalMessage
            )
            console.log('✅ Screenshot note created in Google Docs')
            showDocsNotification('success', 'Screenshot note created in Google Docs')
          } else if (audioTranscription) {
            const openai = getOpenAI()
            let audioAnalysis = ''
            
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
            
            const title = `Audio Note - ${new Date().toLocaleDateString()}`
            await window.electronAPI.docs.createAudioNote(
              title,
              audioTranscription,
              audioAnalysis,
              0
            )
            console.log('✅ Audio note created in Google Docs')
            showDocsNotification('success', 'Audio note created in Google Docs')
          } else {
            const title = `Conversation Note - ${new Date().toLocaleDateString()}`
            await window.electronAPI.docs.createConversationNote(
              title,
              `User: ${finalMessage}\n\nWingman: Note saved to Google Docs`,
              "Note saved to Google Docs"
            )
            console.log('✅ Conversation note created in Google Docs')
            showDocsNotification('success', 'Conversation note created in Google Docs')
          }
          
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
          console.error('❌ Failed to create note:', error)
          showDocsNotification('error', 'Failed to create note')
          
          const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Failed to create Google notes. Please try again.',
            timestamp: new Date()
          }
          setCurrentResponse(errorMsg)
          setStreamingText('')
          setIsStreaming(false)
        } finally {
          setIsCreatingNote(false)
        }
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
    }
  }

  // Handle input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading || isStreaming) return
    await sendMessage(inputValue.trim())
  }

  // Handle audio processed
  const handleAudioProcessed = async (transcription: string) => {
    setPendingCapture({ type: 'audio', data: transcription, timestamp: new Date() })
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

  return {
    currentResponse,
    setCurrentResponse,
    streamingText,
    setStreamingText,
    isStreaming,
    setIsStreaming,
    inputValue,
    setInputValue,
    isLoading,
    setIsLoading,
    pendingCapture,
    setPendingCapture,
    places,
    setPlaces,
    isSearchingMaps,
    setIsSearchingMaps,
    userLocation,
    setUserLocation,
    lastQueryWasLocation,
    setLastQueryWasLocation,
    isCreatingNote,
    setIsCreatingNote,
    docsNotification,
    setDocsNotification,
    contextedMessages,
    setContextedMessages,
    sendMessage,
    handleSubmit,
    handleAudioProcessed,
    showDocsNotification,
    updateDimensions,
  }
} 