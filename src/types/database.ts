/**
 * Database-related type definitions
 * TypeScript interfaces for database entities and data structures
 */

/**
 * Represents a document record in the database
 */
export interface DocumentRecord {
  id: string
  driveId: string
  name: string
  mimeType: string
  modifiedTime: Date
  size?: number
  webViewLink?: string
  userId: string
}

/**
 * Represents a document embedding for vector search
 */
export interface DocumentEmbedding {
  id: string
  fileId: string
  fileName: string
  content: string
  embedding: number[]
  metadata?: any
  chunkIndex: number
  userId: string
}

/**
 * Represents a file candidate for cleanup operations
 */
export interface CleanupCandidate {
  id: string
  name: string
  mimeType: string
  size: number
  modifiedTime: string
  webViewLink?: string
  category: 'tiny' | 'small' | 'empty' | 'duplicate' | 'system' | 'old'
  reason: string
  confidence: 'low' | 'medium' | 'high'
  selected: boolean
}

/**
 * Represents user data stored in the database
 */
export interface UserData {
  uid: string
  email: string
  displayName: string
  photoURL?: string
}

/**
 * Represents Google connection data for authentication
 */
export interface GoogleConnectionData {
  accessToken: string
  refreshToken?: string
  isConnected: boolean
}

/**
 * Represents document data for database operations
 */
export interface DocumentData {
  driveId: string
  name: string
  mimeType: string
  modifiedTime: Date
  size?: number
  webViewLink?: string
  userId: string
}

/**
 * Represents embedding data for vector operations
 */
export interface EmbeddingData {
  fileId: string
  fileName: string
  content: string
  embedding: number[]
  metadata?: any
  chunkIndex?: number
  userId: string
}

/**
 * Represents message data for chat history
 */
export interface MessageData {
  content: string
  sender: string
  images?: string[]
  driveContext?: any[]
}

/**
 * Represents cleanup activity tracking data
 */
export interface CleanupActivityData {
  filesDeleted: number
  filesRequested: number
  errors: number
  deletedFileNames: string[]
}

/**
 * Represents organization activity tracking data
 */
export interface OrganizationActivityData {
  clusterName: string
  folderName: string
  filesMoved: number
  method: string
  confidence: number
  metadata?: any
} 