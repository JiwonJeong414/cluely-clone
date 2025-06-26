// Query helper functions
export const isCalendarQuery = (query: string): boolean => {
  const calendarKeywords = [
    'calendar', 'schedule', 'meeting', 'appointment', 'event',
    'today', 'tomorrow', 'this week', 'next week', 'coming up',
    'busy', 'free', 'available', 'when am i', 'what\'s next',
    'upcoming', 'agenda', 'plans', 'booked'
  ]
  
  const lowerQuery = query.toLowerCase()
  return calendarKeywords.some(keyword => lowerQuery.includes(keyword))
}

export const isDriveQuery = (query: string): boolean => {
  const driveKeywords = [
    'drive', 'document', 'file', 'folder', 'google drive', 'my drive',
    'search my', 'find in my', 'look in my', 'check my', 'in my drive',
    'search drive', 'find in drive', 'look in drive', 'check drive',
    'search documents', 'find documents', 'look for documents',
    'search files', 'find files', 'look for files',
    'what documents', 'what files', 'which documents', 'which files'
  ]
  
  const lowerQuery = query.toLowerCase()
  return driveKeywords.some(keyword => lowerQuery.includes(keyword))
}

export const isAudioQuery = (query: string): boolean => {
  const audioKeywords = [
    'what is this guy saying', 'what did he say', 'what did she say',
    'what are they saying', 'what is being said', 'what did they say',
    'transcribe', 'transcription', 'what was said', 'what did the audio say',
    'what did the recording say', 'what did the voice say', 'what did the person say',
    'what is the audio about', 'what is the recording about', 'what is the voice about',
    'what is the person talking about', 'what is being discussed', 'what is the conversation about'
  ]
  
  const lowerQuery = query.toLowerCase()
  return audioKeywords.some(keyword => lowerQuery.includes(keyword))
}

export const isLocationQuery = (query: string): boolean => {
  const locationKeywords = [
    'near me', 'nearby', 'closest', 'nearest', 'around here', 'close to me',
    'restaurant', 'coffee', 'cafe', 'gas station', 'hospital', 'pharmacy',
    'store', 'shop', 'bank', 'atm', 'hotel', 'parking', 'grocery',
    'directions to', 'how to get to', 'drive to', 'walk to', 'navigate to',
    'find a', 'where is the', 'location of', 'address of'
  ]
  
  const lowerQuery = query.toLowerCase()
  
  // Must contain a location keyword AND not be asking about documents/calendar
  const hasLocationKeyword = locationKeywords.some(keyword => lowerQuery.includes(keyword))
  const isNotDocumentQuery = !lowerQuery.includes('document') && !lowerQuery.includes('file') && !lowerQuery.includes('drive')
  const isNotCalendarQuery = !lowerQuery.includes('meeting') && !lowerQuery.includes('schedule') && !lowerQuery.includes('calendar')
  
  return hasLocationKeyword && isNotDocumentQuery && isNotCalendarQuery
}

export const isCalendarCreationQuery = (query: string): boolean => {
  const creationKeywords = [
    'schedule', 'book', 'create', 'add', 'set up', 'arrange', 'plan',
    'meeting', 'appointment', 'event', 'call', 'call with', 'meet with',
    'calendar event', 'calendar meeting', 'schedule meeting', 'book meeting',
    'set up meeting', 'arrange meeting', 'plan meeting', 'create event',
    'add event', 'schedule call', 'book call', 'set up call'
  ]
  
  const lowerQuery = query.toLowerCase()
  return creationKeywords.some(keyword => lowerQuery.includes(keyword))
}

// Parse calendar creation request to pre-fill form fields
export const parseCalendarCreationRequest = (query: string): any => {
  const lowerQuery = query.toLowerCase()
  const prefill: any = {}
  
  // Extract title/summary
  const titlePatterns = [
    // "schedule a meeting with John" -> "meeting with John"
    /(?:schedule|book|create|add|set up|arrange|plan)\s+(?:a\s+)?(meeting|appointment|event|call)\s+(?:with\s+)?(.+?)(?:\s+(?:at|on|for|tomorrow|today|next|this|in|\d{1,2}:\d{2})|$)/i,
    // "meeting with John" -> "meeting with John"
    /(meeting|appointment|event|call)\s+(?:with\s+)?(.+?)(?:\s+(?:at|on|for|tomorrow|today|next|this|in|\d{1,2}:\d{2})|$)/i,
    // "call with team" -> "call with team"
    /(?:with\s+)?(.+?)(?:\s+(?:meeting|appointment|event|call))(?:\s+(?:at|on|for|tomorrow|today|next|this|in|\d{1,2}:\d{2})|$)/i,
    // Fallback: just get the main content after action words
    /(?:schedule|book|create|add|set up|arrange|plan)\s+(?:a\s+)?(.+?)(?:\s+(?:at|on|for|tomorrow|today|next|this|in|\d{1,2}:\d{2})|$)/i
  ]
  
  for (const pattern of titlePatterns) {
    const match = query.match(pattern)
    if (match && match[1]) {
      // If we have both type and description, combine them
      if (match[2]) {
        prefill.summary = `${match[1]} ${match[2]}`.trim()
      } else {
        prefill.summary = match[1].trim()
      }
      break
    }
  }
  
  // If no title was extracted, try to get something meaningful
  if (!prefill.summary) {
    // Look for common meeting patterns
    const meetingMatch = query.match(/(?:meeting|appointment|event|call)\s+(?:with\s+)?(.+?)(?:\s|$)/i)
    if (meetingMatch) {
      prefill.summary = `meeting with ${meetingMatch[1].trim()}`
    } else {
      // Fallback to a generic title
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
  } else {
    // Handle "next [day]" patterns like "next Thursday", "next Monday", etc.
    const nextDayMatch = lowerQuery.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i)
    if (nextDayMatch) {
      const targetDay = nextDayMatch[1].toLowerCase()
      const dayMap: { [key: string]: number } = {
        'monday': 1, 'mon': 1,
        'tuesday': 2, 'tue': 2,
        'wednesday': 3, 'wed': 3,
        'thursday': 4, 'thu': 4,
        'friday': 5, 'fri': 5,
        'saturday': 6, 'sat': 6,
        'sunday': 0, 'sun': 0
      }
      
      const targetDayNum = dayMap[targetDay]
      if (targetDayNum !== undefined) {
        const now = new Date()
        const currentDay = now.getDay()
        let daysToAdd = targetDayNum - currentDay
        
        // If the target day is today or has passed this week, add 7 days to get to next week
        if (daysToAdd <= 0) {
          daysToAdd += 7
        }
        
        const nextTargetDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
        prefill.startDate = nextTargetDate.toISOString().split('T')[0]
      }
    }
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

// Format time helper
export const formatEventTime = (event: any): string => {
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

// Location permission helper
export const requestLocationPermission = async (): Promise<{ lat: number; lng: number } | null> => {
  try {
    console.log('🌍 Requesting location permission...')
    
    // First check if geolocation is supported
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported')
      alert('Geolocation is not supported by this browser')
      return null
    }
    
    // Check current permission state if available
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        console.log('📍 Current location permission state:', permission.state)
        
        if (permission.state === 'denied') {
          alert('Location access is blocked. Please enable it in your browser settings and refresh the page.')
          return null
        }
      } catch (permError) {
        console.warn('Could not check permission state:', permError)
      }
    }
    
    // Request location
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Location request timed out'))
      }, 15000)
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId)
          console.log('✅ Location obtained:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          clearTimeout(timeoutId)
          console.error('❌ Location error:', error)
          
          let message = 'Failed to get your location: '
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message += 'Permission denied. Please allow location access and try again.'
              break
            case error.POSITION_UNAVAILABLE:
              message += 'Location unavailable. Please check your GPS or internet connection.'
              break
            case error.TIMEOUT:
              message += 'Request timed out. Please try again.'
              break
            default:
              message += error.message || 'Unknown error occurred'
          }
          
          alert(message)
          reject(new Error(message))
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000 // 5 minutes
        }
      )
    })
  } catch (error) {
    console.error('❌ Location permission error:', error)
    return null
  }
}

// Add smart suggestions based on calendar context
export const getSmartSuggestions = (): string[] => {
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
  
  // Add calendar-specific suggestions if connected
  if (window.electronAPI?.auth) {
    // This would need to be passed as a parameter or checked differently
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