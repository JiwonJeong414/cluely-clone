/**
 * Common type definitions
 * Shared utility types and common interfaces used across the application
 */

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// FILE AND MEDIA TYPES
// ============================================================================

export interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  lastModified: Date
  path?: string
  url?: string
}

export interface MediaFile extends FileInfo {
  duration?: number
  dimensions?: {
    width: number
    height: number
  }
  thumbnail?: string
}

// ============================================================================
// UI AND COMPONENT TYPES
// ============================================================================

export interface LoadingState {
  isLoading: boolean
  error?: string
  progress?: number
}

export interface ModalState {
  isOpen: boolean
  title?: string
  content?: React.ReactNode
  onClose?: () => void
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  timestamp: Date
}

// ============================================================================
// FORM AND INPUT TYPES
// ============================================================================

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox'
  required?: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  validation?: {
    pattern?: RegExp
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
  }
}

export interface FormData {
  [key: string]: any
}

export interface FormErrors {
  [key: string]: string
}

// ============================================================================
// DATE AND TIME TYPES
// ============================================================================

export interface TimeRange {
  start: Date
  end: Date
}

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface TimeSlot {
  start: string // HH:mm format
  end: string // HH:mm format
  available: boolean
}

// ============================================================================
// LOCATION TYPES
// ============================================================================

export interface Coordinates {
  lat: number
  lng: number
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  formatted?: string
}

// ============================================================================
// SEARCH AND FILTER TYPES
// ============================================================================

export interface SearchFilters {
  query?: string
  category?: string
  dateRange?: DateRange
  tags?: string[]
  [key: string]: any
}

export interface SortOption {
  field: string
  direction: 'asc' | 'desc'
  label: string
}

// ============================================================================
// EVENT AND CALLBACK TYPES
// ============================================================================

export interface EventHandler<T = any> {
  (event: T): void
}

export interface AsyncEventHandler<T = any> {
  (event: T): Promise<void>
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type Nullable<T> = T | null

export type Undefinable<T> = T | undefined

// ============================================================================
// ENUM TYPES
// ============================================================================

export enum FileType {
  DOCUMENT = 'document',
  SPREADSHEET = 'spreadsheet',
  PRESENTATION = 'presentation',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  OTHER = 'other'
}

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin'
}

export enum Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted'
} 