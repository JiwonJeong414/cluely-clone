import { useState } from 'react'
import { getOpenAI } from '../api/openai'
import type { ChatMessage } from '../types'
import type { Message, PendingCapture } from '../types/app'
import type { ChatInterfaceProps } from '../types/components'

export function useChat({
  user,
  googleConnection,
  pendingCapture,
  setPendingCapture,
  setPlaces,
  setIsSearchingMaps,
  updateDimensions
}: Pick<ChatInterfaceProps, 'user' | 'googleConnection' | 'pendingCapture' | 'setPendingCapture' | 'setPlaces' | 'setIsSearchingMaps' | 'updateDimensions'>) {
  const [currentResponse, setCurrentResponse] = useState<Message | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Handle pending captures (screenshot/audio)
  const processPendingCapture = (userMessage: string, screenshotDataUrl?: string) => {
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

    return { finalMessage, finalScreenshot, audioTranscription }
  }

  // Create Google Docs notes
  const createNote = async (finalMessage: string, finalScreenshot?: string, audioTranscription?: string | null) => {
    try {
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
        console.log('Screenshot note created in Google Docs')
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
        console.log('Audio note created in Google Docs')
      } else {
        const title = `Conversation Note - ${new Date().toLocaleDateString()}`
        await window.electronAPI.docs.createConversationNote(
          title,
          `User: ${finalMessage}\n\nWingman: Note saved to Google Docs`,
          "Note saved to Google Docs"
        )
        console.log('Conversation note created in Google Docs')
      }
      
      return true
    } catch (error) {
      console.error('Failed to create note:', error)
      return false
    }
  }

  // Search Google Drive
  const searchDrive = async (query: string) => {
    if (!googleConnection.isConnected || !window.electronAPI?.drive) return []
    
    const isDriveSearch = query.toLowerCase().includes('drive') || 
      query.toLowerCase().includes('document') || 
      query.toLowerCase().includes('file') ||
      query.toLowerCase().includes('swift') ||
      query.toLowerCase().includes('search')

    if (!isDriveSearch) return []

    try {
      console.log('Searching drive for:', query)
      const searchResult = await window.electronAPI.drive.search(query, 5)
      if (searchResult.success && searchResult.results) {
        console.log(`Found ${searchResult.results.length} relevant documents`)
        return searchResult.results
      }
    } catch (error) {
      console.error('Drive search error:', error)
    }
    
    return []
  }

  // Search maps/locations
  const searchMaps = async (query: string) => {
    if (!window.electronAPI?.maps) return

    const isLocationQuery = query.toLowerCase().includes('near me') || 
      query.toLowerCase().includes('nearby') ||
      query.toLowerCase().includes('coffee') ||
      query.toLowerCase().includes('restaurant') ||
      query.toLowerCase().includes('gas station') ||
      query.toLowerCase().includes('hospital') ||
      query.toLowerCase().includes('pharmacy') ||
      query.toLowerCase().includes('bank') ||
      query.toLowerCase().includes('atm') ||
      query.toLowerCase().includes('hotel') ||
      query.toLowerCase().includes('parking')

    if (!isLocationQuery) return

    try {
      console.log('Searching maps for:', query)
      setIsSearchingMaps(true)
      
      const searchResult = await window.electronAPI.maps.search(query)
      if (searchResult.success && searchResult.places) {
        setPlaces(searchResult.places)
        console.log(`Found ${searchResult.places.length} places`)
      } else {
        console.error('Maps search failed:', searchResult.error)
      }
    } catch (error) {
      console.error('Maps search error:', error)
    } finally {
      setIsSearchingMaps(false)
    }
  }

  // Get AI response
  const getAIResponse = async (finalMessage: string, finalScreenshot?: string, driveSearchResults: any[] = [], calendarContext?: string) => {
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
        }
      ]

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
    
    return fullResponse
  }

  // Main send message function
  const sendMessage = async (
    userMessage: string, 
    screenshotDataUrl?: string, 
    driveContext?: any[], 
    calendarContext?: string
  ) => {
    // Process pending captures
    const { finalMessage, finalScreenshot, audioTranscription } = processPendingCapture(userMessage, screenshotDataUrl)

    // Check if this is a notes request
    const isNotesRequest = finalMessage.toLowerCase().includes('notes') || finalMessage.toLowerCase().includes('save this')

    setCurrentResponse(null)
    setStreamingText('')
    setIsLoading(true)
    setIsStreaming(true)

    try {
      // Handle notes creation
      if (isNotesRequest && googleConnection.isConnected && window.electronAPI?.docs) {
        const success = await createNote(finalMessage, finalScreenshot, audioTranscription)
        
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: success ? 'Google notes created!' : 'Failed to create Google notes. Please try again.',
          timestamp: new Date(),
          driveContext: finalScreenshot ? undefined : driveContext,
          calendarContext
        }
        
        setCurrentResponse(assistantMsg)
        setStreamingText('')
        setIsStreaming(false)
        return
      }

      // Search drive and maps in parallel
      const [driveSearchResults] = await Promise.all([
        searchDrive(finalMessage),
        searchMaps(finalMessage)
      ])

      // Get AI response
      const fullResponse = await getAIResponse(finalMessage, finalScreenshot, driveSearchResults, calendarContext)
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
        driveContext: finalScreenshot ? undefined : driveSearchResults,
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
        updateDimensions()
      }, 200)
    }
  }

  return {
    currentResponse,
    streamingText,
    isStreaming,
    isLoading,
    sendMessage
  }
} 