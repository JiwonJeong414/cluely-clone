import { useState } from 'react'
import { formatEventTime } from '../utils/calendarUtils'
import type { User, GoogleConnection, CalendarEvent } from '../../electron/preload'

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

export function useCalendarHandlers(user: User | null, googleConnection: GoogleConnection) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [selectedCalendarRange, setSelectedCalendarRange] = useState<'today' | 'week' | 'next-week'>('today')
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [showCreateEventForm, setShowCreateEventForm] = useState(false)
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    attendees: ''
  })

  const loadCalendarEvents = async (range: 'today' | 'week' | 'next-week') => {
    if (!window.electronAPI?.calendar || !user || !googleConnection.isConnected || isLoadingCalendar) return
    setIsLoadingCalendar(true)
    try {
      let result
      switch (range) {
        case 'today': result = await window.electronAPI.calendar.getToday(); break
        case 'week': result = await window.electronAPI.calendar.getWeek(); break
        case 'next-week': result = await window.electronAPI.calendar.getNextWeek(); break
        default: result = await window.electronAPI.calendar.getToday()
      }
      if (result.success) {
        setCalendarEvents(result.events || [])
        console.log(`📅 Loaded ${result.events?.length || 0} events for ${range}`)
      } else {
        console.error('Failed to load calendar events:', result.error)
        setCalendarEvents([])
      }
    } catch (error) {
      console.error('Error loading calendar events:', error)
      setCalendarEvents([])
    } finally {
      setIsLoadingCalendar(false)
    }
  }
  const handleCalendarRangeChange = (range: 'today' | 'week' | 'next-week') => {
    setSelectedCalendarRange(range)
    loadCalendarEvents(range)
  }
  const handleCreateEvent = async () => {
    if (!window.electronAPI?.calendar || !user || !googleConnection.isConnected) return
    if (!newEvent.summary.trim() || !newEvent.startDate || !newEvent.startTime) {
      alert('Please fill in the event title, start date, and start time.')
      return
    }
    setIsCreatingEvent(true)
    try {
      const startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime}`)
      const endDateTime = newEvent.endDate && newEvent.endTime ? new Date(`${newEvent.endDate}T${newEvent.endTime}`) : new Date(startDateTime.getTime() + 60 * 60 * 1000)
      const attendees = newEvent.attendees.split(',').map(email => email.trim()).filter(email => email && email.includes('@'))
      const eventData = {
        summary: newEvent.summary.trim(),
        description: newEvent.description.trim() || undefined,
        start: { dateTime: startDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: endDateTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        location: newEvent.location.trim() || undefined,
        attendees: attendees.length > 0 ? attendees : undefined
      }
      const result = await window.electronAPI.calendar.createEvent(eventData)
      if (result.success && result.event) {
        console.log('✅ Event created successfully:', result.event)
        setNewEvent({ summary: '', description: '', startDate: '', startTime: '', endDate: '', endTime: '', location: '', attendees: '' })
        setShowCreateEventForm(false)
        loadCalendarEvents(selectedCalendarRange)
        alert(`Event "${result.event.summary}" created successfully!`)
      } else {
        console.error('❌ Failed to create event:', result.error)
        alert(`Failed to create event: ${result.error}`)
      }
    } catch (error) {
      console.error('❌ Error creating event:', error)
      alert(`Error creating event: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreatingEvent(false)
    }
  }

  // Create calendar event directly from chat input
  const handleCreateEventFromChat = async (eventData: any, originalMessage: string, setCurrentResponse: (response: Message | null) => void, setStreamingText: (text: string) => void, setIsStreaming: (streaming: boolean) => void) => {
    if (!window.electronAPI?.calendar || !user || !googleConnection.isConnected) {
      return
    }

    setIsCreatingEvent(true)
    try {
      // Parse dates and times
      const startDateTime = new Date(`${eventData.startDate}T${eventData.startTime}`)
      const endDateTime = eventData.endDate && eventData.endTime 
        ? new Date(`${eventData.endDate}T${eventData.endTime}`)
        : new Date(startDateTime.getTime() + 60 * 60 * 1000) // Default 1 hour duration

      // Parse attendees (comma-separated emails)
      const attendees = eventData.attendees
        .split(',')
        .map((email: string) => email.trim())
        .filter((email: string) => email && email.includes('@'))

      const calendarEventData = {
        summary: eventData.summary.trim(),
        description: eventData.description.trim() || undefined,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: eventData.location.trim() || undefined,
        attendees: attendees.length > 0 ? attendees : undefined
      }

      const result = await window.electronAPI.calendar.createEvent(calendarEventData)
      
      if (result.success && result.event) {
        console.log('✅ Event created successfully from chat:', result.event)
        
        // Show success response in chat
        const successMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ Calendar event created successfully!\n\n**${result.event.summary}**\n📅 ${formatEventTime(result.event)}${result.event.location ? `\n📍 ${result.event.location}` : ''}${result.event.htmlLink ? `\n🔗 [View in Calendar](${result.event.htmlLink})` : ''}`,
          timestamp: new Date()
        }
        
        setCurrentResponse(successMsg)
        setStreamingText('')
        setIsStreaming(false)
        
        // Refresh calendar events
        loadCalendarEvents(selectedCalendarRange)
      } else {
        console.error('❌ Failed to create event from chat:', result.error)
        
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ Failed to create calendar event: ${result.error}`,
          timestamp: new Date()
        }
        
        setCurrentResponse(errorMsg)
        setStreamingText('')
        setIsStreaming(false)
      }
    } catch (error) {
      console.error('❌ Error creating event from chat:', error)
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error creating calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      
      setCurrentResponse(errorMsg)
      setStreamingText('')
      setIsStreaming(false)
    } finally {
      setIsCreatingEvent(false)
    }
  }

  return {
    calendarEvents,
    setCalendarEvents,
    selectedCalendarRange,
    setSelectedCalendarRange,
    isLoadingCalendar,
    setIsLoadingCalendar,
    isCreatingEvent,
    setIsCreatingEvent,
    showCreateEventForm,
    setShowCreateEventForm,
    newEvent,
    setNewEvent,
    loadCalendarEvents,
    handleCalendarRangeChange,
    handleCreateEvent,
    handleCreateEventFromChat,
  }
} 