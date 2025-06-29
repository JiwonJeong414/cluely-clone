import { ipcMain } from 'electron'
import { CalendarService } from '../../src/services/calendar/CalendarService'
import { AuthService } from '../../src/services/auth/AuthService'
import { DatabaseService } from '../../src/services/database/DatabaseService'

export function setupCalendarHandlers(
  calendarService: CalendarService, 
  authService: AuthService, 
  dbService: DatabaseService
) {
  // Get calendar events with time range
  ipcMain.handle('calendar-get-events', async (event, timeRange?: { start?: string, end?: string }) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log('🗓️ Fetching calendar events...')
      
      let events
      if (timeRange?.start && timeRange?.end) {
        events = await calendarService.getEventsForDateRange(
          new Date(timeRange.start),
          new Date(timeRange.end)
        )
      } else {
        events = await calendarService.getUpcomingEvents()
      }
      
      console.log(`✅ Found ${events.length} calendar events`)
      return { success: true, events }
    } catch (error) {
      console.error('❌ Calendar get events error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get events' 
      }
    }
  })

  // Get today's events
  ipcMain.handle('calendar-get-today', async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log('📅 Fetching today\'s events...')
      
      const events = await calendarService.getTodaysEvents()
      
      console.log(`✅ Found ${events.length} events for today`)
      return { success: true, events }
    } catch (error) {
      console.error('❌ Calendar get today error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get today\'s events' 
      }
    }
  })

  // Get this week's events
  ipcMain.handle('calendar-get-week', async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log('📅 Fetching this week\'s events...')
      
      const events = await calendarService.getThisWeeksEvents()
      
      console.log(`✅ Found ${events.length} events for this week`)
      return { success: true, events }
    } catch (error) {
      console.error('❌ Calendar get week error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get week\'s events' 
      }
    }
  })

  // Get next week's events
  ipcMain.handle('calendar-get-next-week', async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log('📅 Fetching next week\'s events...')
      
      const events = await calendarService.getNextWeeksEvents()
      
      console.log(`✅ Found ${events.length} events for next week`)
      return { success: true, events }
    } catch (error) {
      console.error('❌ Calendar get next week error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get next week\'s events' 
      }
    }
  })

  // Analyze calendar schedule
  ipcMain.handle('calendar-analyze', async (event, query: string) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log(`🤖 Analyzing calendar for query: "${query}"`)
      
      const analysis = await calendarService.analyzeSchedule(query)
      
      console.log(`✅ Calendar analysis completed: ${analysis.events.length} events, ${analysis.insights.length} insights`)
      return { success: true, analysis }
    } catch (error) {
      console.error('❌ Calendar analyze error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze calendar' 
      }
    }
  })

  // Get calendar context for AI
  ipcMain.handle('calendar-get-context', async (event, query: string) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log(`📋 Getting calendar context for query: "${query}"`)
      
      const context = await calendarService.getCalendarContext(query)
      
      console.log(`✅ Calendar context generated (${context.length} characters)`)
      return { success: true, context }
    } catch (error) {
      console.error('❌ Calendar get context error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get calendar context' 
      }
    }
  })

  // Create calendar event
  ipcMain.handle('calendar-create-event', async (event, eventData: any) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log(`📅 Creating calendar event: "${eventData.summary}"`)
      
      const createdEvent = await calendarService.createEvent(eventData)
      
      console.log(`✅ Calendar event created successfully: ${createdEvent.id}`)
      return { success: true, event: createdEvent }
    } catch (error) {
      console.error('❌ Calendar create event error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create calendar event' 
      }
    }
  })
}