/**
 * Database-related type definitions
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

export interface UserData {
  uid: string
  email: string
  displayName: string
  photoURL?: string
}

export interface GoogleConnectionData {
  accessToken: string
  refreshToken?: string
  isConnected: boolean
}

export interface DocumentData {
  driveId: string
  name: string
  mimeType: string
  modifiedTime: Date
  size?: number
  webViewLink?: string
  userId: string
}

export interface EmbeddingData {
  fileId: string
  fileName: string
  content: string
  embedding: number[]
  metadata?: any
  chunkIndex?: number
  userId: string
}

export interface MessageData {
  content: string
  sender: string
  images?: string[]
  driveContext?: any[]
}

export interface CleanupActivityData {
  filesDeleted: number
  filesRequested: number
  errors: number
  deletedFileNames: string[]
}

export interface OrganizationActivityData {
  clusterName: string
  folderName: string
  filesMoved: number
  method: string
  confidence: number
  metadata?: any
} 