/**
 * Calendar Service
 * 
 * Handles Google Calendar integration for event management, scheduling analysis,
 * and calendar insights. Provides functionality for fetching events, analyzing
 * schedules, generating insights, and creating new calendar events.
 */

import { google } from 'googleapis'
import { AuthService } from '../auth/AuthService'
import { DatabaseService } from '../database/DatabaseService'
import type { CalendarEvent, CalendarInsight, CreateEventRequest } from '../../types'

export class CalendarService {
  private static instance: CalendarService
  private authService: AuthService
  private db: DatabaseService
  private calendar: any

  private constructor() {
    this.authService = AuthService.getInstance()
    this.db = DatabaseService.getInstance()
  }

  /**
   * Get the singleton instance of CalendarService
   * @returns CalendarService - The singleton instance
   */
  static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService()
    }
    return CalendarService.instance
  }

  /**
   * Initialize the Google Calendar API client
   * Sets up the calendar API with OAuth2 authentication
   */
  private initializeCalendar() {
    const oauth2Client = this.authService.getOAuthClient()
    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  }

  /**
   * Get upcoming calendar events within a specified time range
   * @param timeMin - Start time for the query (defaults to now)
   * @param timeMax - End time for the query (defaults to 7 days from now)
   * @param maxResults - Maximum number of events to return (default: 50)
   * @returns Promise<CalendarEvent[]> - Array of calendar events
   * @throws {Error} If calendar API call fails
   */
  async getUpcomingEvents(
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = 50
  ): Promise<CalendarEvent[]> {
    if (!this.calendar) this.initializeCalendar()

    const now = timeMin || new Date()
    const weekFromNow = timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: weekFromNow.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      })

      // Update calendar sync time
      const user = this.authService.getCurrentUser()
      if (user) {
        await this.db.updateCalendarSyncTime(user.id)
      }

      return response.data.items?.map(this.formatEvent) || []
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      throw error
    }
  }

  /**
   * Get calendar events for a specific date range
   * @param startDate - Start date for the query
   * @param endDate - End date for the query
   * @returns Promise<CalendarEvent[]> - Array of calendar events in the date range
   * @throws {Error} If calendar API call fails
   */
  async getEventsForDateRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    if (!this.calendar) this.initializeCalendar()

    console.log('DEBUG: Fetching events from', startDate.toISOString(), 'to', endDate.toISOString())

    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      })

      console.log('DEBUG: Raw Google Calendar response:', {
        itemsCount: response.data.items?.length || 0,
        items: response.data.items?.map((item: any) => ({
          id: item.id,
          summary: item.summary,
          start: item.start,
          end: item.end
        }))
      })

      // Update calendar sync time
      const user = this.authService.getCurrentUser()
      if (user) {
        await this.db.updateCalendarSyncTime(user.id)
      }

      const formattedEvents = response.data.items?.map(this.formatEvent) || []
      console.log('DEBUG: Formatted events:', formattedEvents.length)

      return formattedEvents
    } catch (error) {
      console.error('ERROR: Calendar API call failed:', error)
      
      // Log more details about the error
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as any
        console.error('ERROR: Response status:', apiError.response.status)
        console.error('ERROR: Response data:', apiError.response.data)
      }
      
      throw error
    }
  }

  /**
   * Get all events scheduled for today
   * @returns Promise<CalendarEvent[]> - Array of today's calendar events
   */
  async getTodaysEvents(): Promise<CalendarEvent[]> {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    console.log('DEBUG: Getting today\'s events')
    console.log('Start of day:', startOfDay.toISOString())
    console.log('End of day:', endOfDay.toISOString())

    const events = await this.getEventsForDateRange(startOfDay, endOfDay)
    console.log(`DEBUG: Found ${events.length} events for today`)
    
    return events
  }

  /**
   * Get all events for the current week
   * @returns Promise<CalendarEvent[]> - Array of this week's calendar events
   */
  async getThisWeeksEvents(): Promise<CalendarEvent[]> {
    const now = new Date()
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)

    return this.getEventsForDateRange(startOfWeek, endOfWeek)
  }

  /**
   * Get all events for the next week
   * @returns Promise<CalendarEvent[]> - Array of next week's calendar events
   */
  async getNextWeeksEvents(): Promise<CalendarEvent[]> {
    const now = new Date()
    const nextWeekStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const nextWeekEnd = new Date(nextWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    return this.getEventsForDateRange(nextWeekStart, nextWeekEnd)
  }

  /**
   * Analyze calendar schedule based on a natural language query
   * @param query - Natural language query describing the time period to analyze
   * @returns Promise<{ events: CalendarEvent[], insights: CalendarInsight[], summary: string }> - Analysis results
   */
  async analyzeSchedule(query: string): Promise<{
    events: CalendarEvent[]
    insights: CalendarInsight[]
    summary: string
  }> {
    // Parse the query to determine what calendar data to fetch
    const timeRange = this.parseTimeQuery(query)
    const events = await this.getEventsForDateRange(timeRange.start, timeRange.end)
    
    // Generate insights
    const insights = this.generateInsights(events, query)
    
    // Create a summary
    const summary = this.createScheduleSummary(events, timeRange, query)

    return { events, insights, summary }
  }

  /**
   * Parse natural language time queries into date ranges
   * @param query - Natural language query (e.g., "today", "this week", "next week")
   * @returns { start: Date, end: Date } - Parsed date range
   */
  private parseTimeQuery(query: string): { start: Date, end: Date } {
    const now = new Date()
    const lowerQuery = query.toLowerCase()

    // Today
    if (lowerQuery.includes('today') || lowerQuery.includes('today\'s')) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      return { start, end }
    }

    // Tomorrow
    if (lowerQuery.includes('tomorrow')) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      return { start, end }
    }

    // This week
    if (lowerQuery.includes('this week') || lowerQuery.includes('week')) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
      return { start, end }
    }

    // Next week
    if (lowerQuery.includes('next week')) {
      const start = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const nextWeekStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - start.getDay())
      const end = new Date(nextWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      return { start: nextWeekStart, end }
    }

    // Next few days
    if (lowerQuery.includes('coming days') || lowerQuery.includes('next few days')) {
      const start = now
      const end = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      return { start, end }
    }

    // Default to next 7 days
    const start = now
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return { start, end }
  }

  /**
   * Generate insights from calendar events
   * @param events - Array of calendar events to analyze
   * @param query - Original query for context
   * @returns CalendarInsight[] - Array of generated insights
   */
  private generateInsights(events: CalendarEvent[], query: string): CalendarInsight[] {
    const insights: CalendarInsight[] = []
    const now = new Date()

    // Upcoming busy periods
    const busyPeriods = this.findBusyPeriods(events)
    busyPeriods.forEach(period => {
      insights.push({
        type: 'upcoming_busy_period',
        message: `You have ${period.events.length} back-to-back meetings from ${this.formatTime(period.start)} to ${this.formatTime(period.end)}`,
        events: period.events,
        priority: period.events.length > 3 ? 'high' : 'medium',
        actionable: true
      })
    })

    // Travel time warnings
    const travelWarnings = this.findTravelTimeIssues(events)
    travelWarnings.forEach(warning => {
      insights.push({
        type: 'travel_time',
        message: warning.message,
        events: warning.events,
        priority: 'high',
        actionable: true
      })
    })

    // Meeting preparation suggestions
    const importantMeetings = events.filter(event => 
      event.attendees && event.attendees.length > 5 || 
      event.summary.toLowerCase().includes('interview') ||
      event.summary.toLowerCase().includes('presentation') ||
      event.summary.toLowerCase().includes('review')
    )

    importantMeetings.forEach(meeting => {
      const startTime = new Date(meeting.start.dateTime || meeting.start.date!)
      const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      if (hoursUntil > 0 && hoursUntil < 24) {
        insights.push({
          type: 'meeting_prep',
          message: `Consider preparing for "${meeting.summary}" - it's coming up in ${Math.round(hoursUntil)} hours`,
          events: [meeting],
          priority: 'medium',
          actionable: true
        })
      }
    })

    // Free time identification
    const freeSlots = this.findFreeTime(events)
    if (freeSlots.length > 0) {
      insights.push({
        type: 'free_time',
        message: `You have ${freeSlots.length} free slots available for focused work or catch-ups`,
        events: [],
        priority: 'low',
        actionable: true
      })
    }

    return insights
  }

  /**
   * Find busy periods with back-to-back meetings
   * @param events - Array of calendar events to analyze
   * @returns Array<{ start: Date, end: Date, events: CalendarEvent[] }> - Busy periods with their events
   */
  private findBusyPeriods(events: CalendarEvent[]): Array<{
    start: Date
    end: Date
    events: CalendarEvent[]
  }> {
    const busyPeriods: Array<{ start: Date, end: Date, events: CalendarEvent[] }> = []
    
    for (let i = 0; i < events.length - 1; i++) {
      const currentEvent = events[i]
      const currentEnd = new Date(currentEvent.end.dateTime || currentEvent.end.date!)
      const chainedEvents = [currentEvent]
      
      let j = i + 1
      while (j < events.length) {
        const nextEvent = events[j]
        const nextStart = new Date(nextEvent.start.dateTime || nextEvent.start.date!)
        
        // If next event starts within 30 minutes of current event ending
        if (nextStart.getTime() - currentEnd.getTime() <= 30 * 60 * 1000) {
          chainedEvents.push(nextEvent)
          currentEnd.setTime(new Date(nextEvent.end.dateTime || nextEvent.end.date!).getTime())
          j++
        } else {
          break
        }
      }
      
      if (chainedEvents.length >= 3) {
        busyPeriods.push({
          start: new Date(chainedEvents[0].start.dateTime || chainedEvents[0].start.date!),
          end: new Date(chainedEvents[chainedEvents.length - 1].end.dateTime || chainedEvents[chainedEvents.length - 1].end.date!),
          events: chainedEvents
        })
        
        i = j - 1 // Skip the events we've already processed
      }
    }
    
    return busyPeriods
  }

  /**
   * Find potential travel time issues between events
   * @param events - Array of calendar events to analyze
   * @returns Array<{ message: string, events: CalendarEvent[] }> - Travel time warnings
   */
  private findTravelTimeIssues(events: CalendarEvent[]): Array<{
    message: string
    events: CalendarEvent[]
  }> {
    const warnings: Array<{ message: string; events: CalendarEvent[] }> = []
    
    for (let i = 0; i < events.length - 1; i++) {
      const currentEvent = events[i]
      const nextEvent = events[i + 1]
      
      if (currentEvent.location && nextEvent.location && 
          currentEvent.location !== nextEvent.location) {
        
        const currentEnd = new Date(currentEvent.end.dateTime || currentEvent.end.date!)
        const nextStart = new Date(nextEvent.start.dateTime || nextEvent.start.date!)
        const timeBetween = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60)
        
        if (timeBetween < 30) {
          warnings.push({
            message: `Tight schedule: Only ${Math.round(timeBetween)} minutes to travel from "${currentEvent.location}" to "${nextEvent.location}"`,
            events: [currentEvent, nextEvent]
          })
        }
      }
    }
    
    return warnings
  }

  /**
   * Find free time slots between events during work hours
   * @param events - Array of calendar events to analyze
   * @returns Array<{ start: Date, end: Date, duration: number }> - Free time slots
   */
  private findFreeTime(events: CalendarEvent[]): Array<{
    start: Date
    end: Date
    duration: number
  }> {
    const freeSlots: Array<{ start: Date; end: Date; duration: number }> = []
    const workStart = 9 // 9 AM
    const workEnd = 18 // 6 PM
    
    for (let i = 0; i < events.length - 1; i++) {
      const currentEnd = new Date(events[i].end.dateTime || events[i].end.date!)
      const nextStart = new Date(events[i + 1].start.dateTime || events[i + 1].start.date!)
      
      const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60)
      
      // Only consider gaps of 60+ minutes during work hours
      if (gapMinutes >= 60 && 
          currentEnd.getHours() >= workStart && 
          nextStart.getHours() <= workEnd) {
        freeSlots.push({
          start: currentEnd,
          end: nextStart,
          duration: gapMinutes
        })
      }
    }
    
    return freeSlots
  }

  /**
   * Create a summary of calendar events for a given time range
   * @param events - Array of calendar events
   * @param timeRange - Time range for the summary
   * @param query - Original query for context
   * @returns string - Formatted summary text
   */
  private createScheduleSummary(events: CalendarEvent[], timeRange: { start: Date, end: Date }, query: string): string {
    if (events.length === 0) {
      return `You have no scheduled events in the requested time period.`
    }

    const eventsByDay = this.groupEventsByDay(events)
    const totalEvents = events.length
    const meetingsWithOthers = events.filter(e => e.attendees && e.attendees.length > 1).length
    
    let summary = `You have ${totalEvents} event${totalEvents !== 1 ? 's' : ''} scheduled`
    
    if (meetingsWithOthers > 0) {
      summary += `, including ${meetingsWithOthers} meeting${meetingsWithOthers !== 1 ? 's' : ''} with others`
    }
    
    summary += '. '
    
    // Add day-by-day breakdown for week views
    if (Object.keys(eventsByDay).length > 1) {
      summary += 'Here\'s your daily breakdown:\n\n'
      
      Object.entries(eventsByDay).forEach(([day, dayEvents]) => {
        const dayName = new Date(day).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        summary += `**${dayName}**: ${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}\n`
        
        dayEvents.slice(0, 3).forEach(event => {
          const time = this.formatEventTime(event)
          summary += `  • ${time} - ${event.summary}\n`
        })
        
        if (dayEvents.length > 3) {
          summary += `  • ...and ${dayEvents.length - 3} more\n`
        }
        summary += '\n'
      })
    }
    
    return summary
  }

  /**
   * Group events by day for summary generation
   * @param events - Array of calendar events
   * @returns { [date: string]: CalendarEvent[] } - Events grouped by date
   */
  private groupEventsByDay(events: CalendarEvent[]): { [date: string]: CalendarEvent[] } {
    const grouped: { [date: string]: CalendarEvent[] } = {}
    
    events.forEach(event => {
      const startDate = new Date(event.start.dateTime || event.start.date!)
      const dateKey = startDate.toISOString().split('T')[0]
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })
    
    return grouped
  }

  /**
   * Format Google Calendar API event to internal CalendarEvent type
   * @param googleEvent - Raw event from Google Calendar API
   * @returns CalendarEvent - Formatted calendar event
   */
  private formatEvent(googleEvent: any): CalendarEvent {
    return {
      id: googleEvent.id,
      summary: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      start: {
        dateTime: googleEvent.start?.dateTime,
        date: googleEvent.start?.date,
        timeZone: googleEvent.start?.timeZone
      },
      end: {
        dateTime: googleEvent.end?.dateTime,
        date: googleEvent.end?.date,
        timeZone: googleEvent.end?.timeZone
      },
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map((attendee: any) => ({
        email: attendee.email,
        displayName: attendee.displayName,
        responseStatus: attendee.responseStatus
      })),
      status: googleEvent.status,
      creator: googleEvent.creator ? {
        email: googleEvent.creator.email,
        displayName: googleEvent.creator.displayName
      } : undefined,
      organizer: googleEvent.organizer ? {
        email: googleEvent.organizer.email,
        displayName: googleEvent.organizer.displayName
      } : undefined,
      htmlLink: googleEvent.htmlLink,
      conferenceData: googleEvent.conferenceData ? {
        entryPoints: googleEvent.conferenceData.entryPoints?.map((ep: any) => ({
          entryPointType: ep.entryPointType,
          uri: ep.uri,
          label: ep.label
        }))
      } : undefined
    }
  }

  /**
   * Format a date to readable time string
   * @param date - Date to format
   * @returns string - Formatted time string (e.g., "2:30 PM")
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  /**
   * Format event time range for display
   * @param event - Calendar event to format
   * @returns string - Formatted time range (e.g., "2:30 PM - 3:30 PM")
   */
  private formatEventTime(event: CalendarEvent): string {
    if (event.start.date) {
      return 'All day'
    }
    
    const start = new Date(event.start.dateTime!)
    const end = new Date(event.end.dateTime!)
    
    return `${this.formatTime(start)} - ${this.formatTime(end)}`
  }

  /**
   * Get calendar context for AI analysis
   * @param query - Natural language query for context
   * @returns Promise<string> - Formatted calendar context string
   */
  async getCalendarContext(query: string): Promise<string> {
    const { events, insights, summary } = await this.analyzeSchedule(query)
    
    let context = `Calendar Analysis:\n${summary}\n\n`
    
    if (insights.length > 0) {
      context += 'Key Insights:\n'
      insights.forEach(insight => {
        context += `• ${insight.message}\n`
      })
      context += '\n'
    }
    
    if (events.length > 0) {
      context += 'Upcoming Events:\n'
      events.slice(0, 10).forEach(event => {
        const time = this.formatEventTime(event)
        const location = event.location ? ` (${event.location})` : ''
        context += `• ${time} - ${event.summary}${location}\n`
      })
    }
    
    return context
  }

  /**
   * Test the Google Calendar API connection
   * @returns Promise<boolean> - True if connection is successful
   */
  async testCalendarConnection(): Promise<boolean> {
    if (!this.calendar) this.initializeCalendar()

    try {
      console.log('🔍 Testing calendar connection...')
      
      // Try to get calendar list first
      const calendarListResponse = await this.calendar.calendarList.list()
      console.log('Available calendars:', calendarListResponse.data.items?.map((cal: any) => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary
      })))

      // Test getting primary calendar info
      const primaryCalendar = await this.calendar.calendars.get({
        calendarId: 'primary'
      })
      console.log('Primary calendar:', primaryCalendar.data)

      return true
    } catch (error) {
      console.error('Calendar connection test failed:', error)
      return false
    }
  }

  /**
   * Create a new calendar event
   * @param eventData - Event creation request data
   * @returns Promise<CalendarEvent> - The created calendar event
   * @throws {Error} If event creation fails
   */
  async createEvent(eventData: CreateEventRequest): Promise<CalendarEvent> {
    if (!this.calendar) this.initializeCalendar()

    try {
      // Prepare the event object for Google Calendar API
      const event = {
        summary: eventData.summary,
        description: eventData.description,
        start: eventData.start,
        end: eventData.end,
        location: eventData.location,
        attendees: eventData.attendees?.map((email: string) => ({ email })),
        // Set default timezone if not provided
        timeZone: eventData.start.timeZone || 'America/New_York'
      }

      console.log('Creating calendar event:', {
        summary: event.summary,
        start: event.start,
        end: event.end,
        location: event.location,
        attendeesCount: event.attendees?.length || 0
      })

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendUpdates: 'all' // Send email notifications to attendees
      })

      const createdEvent = this.formatEvent(response.data)
      
      console.log('[✓] Calendar event created successfully:', {
        id: createdEvent.id,
        summary: createdEvent.summary,
        htmlLink: createdEvent.htmlLink
      })

      // Update calendar sync time
      const user = this.authService.getCurrentUser()
      if (user) {
        await this.db.updateCalendarSyncTime(user.id)
      }

      return createdEvent
    } catch (error) {
      console.error('Error creating calendar event:', error)
      throw error
    }
  }
}