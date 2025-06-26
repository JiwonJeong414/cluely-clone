export function isCalendarQuery(query: string): boolean {
  const calendarKeywords = [
    'calendar', 'schedule', 'meeting', 'appointment', 'event',
    'today', 'tomorrow', 'this week', 'next week', 'coming up',
    'busy', 'free', 'available', 'when am i', 'what\'s next',
    'upcoming', 'agenda', 'plans', 'booked'
  ]
  const lowerQuery = query.toLowerCase()
  return calendarKeywords.some(keyword => lowerQuery.includes(keyword))
}

export function isDriveQuery(query: string): boolean {
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

export function isAudioQuery(query: string): boolean {
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

export function isLocationQuery(query: string): boolean {
  const locationKeywords = [
    'near me', 'nearby', 'closest', 'nearest', 'around here', 'close to me',
    'restaurant', 'coffee', 'cafe', 'gas station', 'hospital', 'pharmacy',
    'store', 'shop', 'bank', 'atm', 'hotel', 'parking', 'grocery',
    'directions to', 'how to get to', 'drive to', 'walk to', 'navigate to',
    'find a', 'where is the', 'location of', 'address of'
  ]
  const lowerQuery = query.toLowerCase()
  const hasLocationKeyword = locationKeywords.some(keyword => lowerQuery.includes(keyword))
  const isNotDocumentQuery = !lowerQuery.includes('document') && !lowerQuery.includes('file') && !lowerQuery.includes('drive')
  const isNotCalendarQuery = !lowerQuery.includes('meeting') && !lowerQuery.includes('schedule') && !lowerQuery.includes('calendar')
  return hasLocationKeyword && isNotDocumentQuery && isNotCalendarQuery
}

export function isCalendarCreationQuery(query: string): boolean {
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