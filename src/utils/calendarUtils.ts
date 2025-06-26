import type { CalendarEvent } from '../../electron/preload'

export function parseCalendarCreationRequest(query: string): any {
  const lowerQuery = query.toLowerCase()
  const prefill: any = {}
  
  // Extract title/summary
  const titlePatterns = [
    /(?:schedule|book|create|add|set up|arrange|plan)\s+(?:a\s+)?(meeting|appointment|event|call)\s+(?:with\s+)?(.+?)(?:\s+(?:at|on|for|tomorrow|today|next|this|in|\d{1,2}:\d{2})|$)/i,
    /(meeting|appointment|event|call)\s+(?:with\s+)?(.+?)(?:\s+(?:at|on|for|tomorrow|today|next|this|in|\d{1,2}:\d{2})|$)/i,
    /(?:with\s+)?(.+?)(?:\s+(?:meeting|appointment|event|call))(?:\s+(?:at|on|for|tomorrow|today|next|this|in|\d{1,2}:\d{2})|$)/i,
    /(?:schedule|book|create|add|set up|arrange|plan)\s+(?:a\s+)?(.+?)(?:\s+(?:at|on|for|tomorrow|today|next|this|in|\d{1,2}:\d{2})|$)/i
  ]
  
  for (const pattern of titlePatterns) {
    const match = query.match(pattern)
    if (match && match[1]) {
      if (match[2]) {
        prefill.summary = `${match[1]} ${match[2]}`.trim()
      } else {
        prefill.summary = match[1].trim()
      }
      break
    }
  }
  
  if (!prefill.summary) {
    const meetingMatch = query.match(/(?:meeting|appointment|event|call)\s+(?:with\s+)?(.+?)(?:\s|$)/i)
    if (meetingMatch) {
      prefill.summary = `meeting with ${meetingMatch[1].trim()}`
    } else {
      prefill.summary = 'New Event'
    }
  }
  
  // Extract time references
  if (lowerQuery.includes('tomorrow')) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    prefill.startDate = tomorrow.toISOString().split('T')[0]
  } else if (lowerQuery.includes('today')) {
    const today = new Date()
    prefill.startDate = today.toISOString().split('T')[0]
  }
  
  // Extract time
  const timeMatch = query.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/)
  if (timeMatch) {
    let hours = parseInt(timeMatch[1])
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const period = timeMatch[3]?.toLowerCase()
    
    if (period === 'pm' && hours !== 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0
    
    prefill.startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }
  
  // Extract duration
  const durationMatch = query.match(/(\d+)\s*(hour|hr|minute|min)s?/)
  if (durationMatch) {
    const duration = parseInt(durationMatch[1])
    const unit = durationMatch[2].toLowerCase()
    
    if (prefill.startTime) {
      const startTime = new Date(`2000-01-01T${prefill.startTime}`)
      const endTime = new Date(startTime.getTime() + (unit.startsWith('hour') ? duration * 60 : duration) * 60 * 1000)
      prefill.endTime = endTime.toTimeString().slice(0, 5)
    }
  }
  
  // Extract location
  const locationMatch = query.match(/(?:at|in|location:?)\s+(.+?)(?:\s+(?:at|on|for|tomorrow|today|next|this|in|\d{1,2}:\d{2})|$)/i)
  if (locationMatch) {
    prefill.location = locationMatch[1].trim()
  }
  
  // Extract attendees (emails)
  const emailMatches = query.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g)
  if (emailMatches) {
    prefill.attendees = emailMatches.join(', ')
  }
  
  return prefill
}

export async function getCalendarContextForAI(query: string): Promise<string> {
  if (!window.electronAPI?.calendar) return ''
  
  try {
    const result = await window.electronAPI.calendar.getContext(query)
    if (result.success && result.context) {
      return result.context
    }
  } catch (error) {
    console.error('Error getting calendar context:', error)
  }
  
  return ''
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.start.date) {
    return 'All day'
  }
  
  const start = new Date(event.start.dateTime!)
  const end = new Date(event.end.dateTime!)
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }
  
  return `${formatTime(start)} - ${formatTime(end)}`
}

export function getSmartSuggestions(googleConnection: any): string[] {
  const suggestions = [
    "Answer this Leetcode Question",
    "Explain Quantum Computing",
    "Find free time in my schedule",
    "Search my drive for project documents",
    "Find documents about budget planning",
    "Look for files related to marketing",
    "Find nearby restaurants",
    "How long to get to...",
  ]
  
  if (googleConnection.isConnected) {
    suggestions.push(
      "Schedule a meeting with John tomorrow at 2pm",
      "Book a 1-hour call with the team",
      "Create an event for project review",
      "Set up a meeting at the office",
      "What's my availability this week?",
      "Search my drive for meeting notes",
      "Find documents about quarterly reports",
      "Look for files related to client proposals"
    )
  }
  
  return suggestions
} 