/**
 * Service-related type definitions
 * Centralized types for all service interfaces
 */

// Import types that are already defined in electron preload
import type { CalendarEvent } from './app'

// ============================================================================
// AUDIO SERVICE TYPES
// ============================================================================

export interface AudioCaptureOptions {
  duration?: number // in seconds
  sampleRate?: number
  channels?: number
}

export interface AudioCaptureResult {
  success: boolean
  audioData?: ArrayBuffer
  error?: string
  duration?: number
}

// ============================================================================
// CALENDAR SERVICE TYPES
// ============================================================================

export interface CalendarInsight {
  type: 'upcoming_busy_period' | 'free_time' | 'travel_time' | 'meeting_prep' | 'conflict'
  message: string
  events: CalendarEvent[]
  priority: 'low' | 'medium' | 'high'
  actionable?: boolean
}

// ============================================================================
// DRIVE SERVICE TYPES
// ============================================================================

// Note: SyncOptions is already defined in app.ts

// ============================================================================
// DOCS SERVICE TYPES
// ============================================================================

export interface GoogleDoc {
  id: string
  name: string
  webViewLink: string
  createdTime: string
  modifiedTime: string
}

export interface NoteContent {
  title: string
  content: string
  timestamp: Date
  type: 'screenshot' | 'audio' | 'conversation'
  metadata?: {
    screenshotUrl?: string
    audioDuration?: number
    transcription?: string
    aiAnalysis?: string
  }
}

// ============================================================================
// MAPS SERVICE TYPES
// ============================================================================

export interface SearchOptions {
  location?: { lat: number; lng: number }
  radius?: number // meters, default 5000
  type?: string // 'restaurant', 'gas_station', 'hospital', etc.
  keyword?: string
  minRating?: number
  openNow?: boolean
}

// ============================================================================
// ORGANIZATION SERVICE TYPES
// ============================================================================

export interface FileWithEmbedding {
  fileId: string
  fileName: string
  embedding: number[]
  content?: string
  metadata?: any
  folderPath?: string
}

export interface FileCluster {
  id: string
  name: string
  description: string
  color: string
  suggestedFolderName: string
  category: 'work' | 'personal' | 'media' | 'documents' | 'archive' | 'mixed'
  files: Array<{
    fileId: string
    fileName: string
    confidence: number
    keywords: string[]
  }>
}

export interface OrganizationPlan {
  clusters: FileCluster[]
}

export interface OrganizationResult {
  clustersCreated: number
  foldersCreated: string[]
  filesMoved: number
  errors: string[]
}

// ============================================================================
// VECTOR SERVICE TYPES
// ============================================================================

export interface SearchResult {
  fileId: string
  fileName: string
  content: string
  similarity: number
  metadata?: any
}

// ============================================================================
// GOOGLE API RESPONSE TYPES
// ============================================================================

export interface GooglePlacesResponse {
  status: string
  results: Array<{
    place_id: string
    name: string
    formatted_address: string
    rating?: number
    price_level?: number
    types: string[]
    geometry: {
      location: {
        lat: number
        lng: number
      }
    }
  }>
}

export interface GoogleDistanceMatrixResponse {
  status: string
  rows: Array<{
    elements: Array<{
      status: string
      distance?: {
        text: string
      }
      duration?: {
        text: string
      }
    }>
  }>
}

export interface GooglePlaceDetailsResponse {
  status: string
  result: {
    place_id: string
    name: string
    formatted_address: string
    rating?: number
    price_level?: number
    types: string[]
    geometry: {
      location: {
        lat: number
        lng: number
      }
    }
    formatted_phone_number?: string
    website?: string
    opening_hours?: {
      weekday_text: string[]
    }
  }
} 