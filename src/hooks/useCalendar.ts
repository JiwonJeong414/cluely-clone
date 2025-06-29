import { useState, useEffect } from 'react'
import type { User, GoogleConnection, CalendarEvent } from '../../electron/preload'
import type { CalendarRange } from '../types/app'

export function useCalendar(user: User | null, googleConnection: GoogleConnection) {
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [selectedCalendarRange, setSelectedCalendarRange] = useState<CalendarRange>('today')
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false)
  const [showCreateEventForm, setShowCreateEventForm] = useState(false)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
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

  const loadCalendarEvents = async (range: CalendarRange) => {
    if (!window.electronAPI?.calendar || !user || !googleConnection.isConnected || isLoadingCalendar) {
      return
    }

    setIsLoadingCalendar(true)
    try {
      let result
      switch (range) {
        case 'today':
          result = await window.electronAPI.calendar.getToday()
          break
        case 'week':
          result = await window.electronAPI.calendar.getWeek()
          break
        case 'next-week':
          result = await window.electronAPI.calendar.getNextWeek()
          break
        default:
          result = await window.electronAPI.calendar.getToday()
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

  const handleCalendarRangeChange = (range: CalendarRange) => {
    setSelectedCalendarRange(range)
    loadCalendarEvents(range)
  }

  const handleCreateEvent = async () => {
    if (!window.electronAPI?.calendar || !user || !googleConnection.isConnected) {
      return
    }

    if (!newEvent.summary.trim() || !newEvent.startDate || !newEvent.startTime) {
      alert('Please fill in the event title, start date, and start time.')
      return
    }

    setIsCreatingEvent(true)
    try {
      const startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime}`)
      const endDateTime = newEvent.endDate && newEvent.endTime 
        ? new Date(`${newEvent.endDate}T${newEvent.endTime}`)
        : new Date(startDateTime.getTime() + 60 * 60 * 1000)

      const attendees = newEvent.attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email && email.includes('@'))

      const eventData = {
        summary: newEvent.summary.trim(),
        description: newEvent.description.trim() || undefined,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: newEvent.location.trim() || undefined,
        attendees: attendees.length > 0 ? attendees : undefined
      }

      const result = await window.electronAPI.calendar.createEvent(eventData)
      
      if (result.success && result.event) {
        setNewEvent({
          summary: '',
          description: '',
          startDate: '',
          startTime: '',
          endDate: '',
          endTime: '',
          location: '',
          attendees: ''
        })
        setShowCreateEventForm(false)
        loadCalendarEvents(selectedCalendarRange)
        alert(`Event "${result.event.summary}" created successfully!`)
      } else {
        alert(`Failed to create event: ${result.error}`)
      }
    } catch (error) {
      alert(`Error creating event: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreatingEvent(false)
    }
  }

  const handleCreateEventFromChat = async (eventData: any, originalMessage: string) => {
    // Implementation for creating events from chat
    console.log('Creating event from chat:', eventData, originalMessage)
  }

  // Load events when user connects
  useEffect(() => {
    if (user && googleConnection.isConnected && calendarEvents.length === 0 && !isLoadingCalendar) {
      loadCalendarEvents('today')
    }
  }, [user, googleConnection.isConnected])

  return {
    calendarEvents,
    selectedCalendarRange,
    isLoadingCalendar,
    showCreateEventForm,
    setShowCreateEventForm,
    newEvent,
    setNewEvent,
    isCreatingEvent,
    loadCalendarEvents,
    handleCalendarRangeChange,
    handleCreateEvent,
    handleCreateEventFromChat
  }
}