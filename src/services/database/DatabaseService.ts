/**
 * Database Service
 * 
 * Handles all database operations including user management, document storage,
 * embeddings, cleanup operations, and activity logging.
 */

import { PrismaClient } from '@prisma/client'
import type { User, GoogleConnection } from '../../types'
import type {
  DocumentRecord,
  DocumentEmbedding,
  CleanupCandidate,
  UserData,
  GoogleConnectionData,
  DocumentData,
  EmbeddingData,
  MessageData,
  CleanupActivityData,
  OrganizationActivityData
} from '../../types/database'

export class DatabaseService {
  private static instance: DatabaseService
  private prisma: PrismaClient

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./wingman.db'
        }
      }
    })
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  /**
   * Initialize the database connection and run migrations
   * @throws {Error} If database initialization fails
   */
  async initialize() {
    try {
      // Run migrations if needed
      console.log('Initializing database...')
      
      // Test connection
      await this.prisma.$queryRaw`SELECT 1`
      console.log('[✓] Database connected successfully')
    } catch (error) {
      console.error(' Database initialization failed:', error)
      throw error
    }
  }

  /**
   * Create or update a user in the database
   * @param userData - User information including UID, email, display name, and optional photo URL
   * @returns Promise<User> - The created or updated user object
   */
  async upsertUser(userData: UserData): Promise<User> {
    const user = await this.prisma.user.upsert({
      where: { uid: userData.uid },
      update: {
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        updatedAt: new Date(),
      },
      create: {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return {
      id: user.id,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL || undefined
    }
  }

  /**
   * Retrieve all users from the database
   * @returns Promise<User[]> - Array of user objects
   */
  async getAllUsers(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { updatedAt: 'desc' }
    })

    return users.map((user: any) => ({
      id: user.id,
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL || undefined
    }))
  }

  /**
   * Create or update Google connection for a user
   * @param userId - The user's database ID
   * @param connectionData - Google connection information including tokens and status
   * @returns Promise<GoogleConnection> - The created or updated connection object
   */
  async upsertGoogleConnection(userId: string, connectionData: GoogleConnectionData) {
    return await this.prisma.googleConnection.upsert({
      where: { userId },
      update: {
        accessToken: connectionData.accessToken,
        refreshToken: connectionData.refreshToken,
        isConnected: connectionData.isConnected,
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        accessToken: connectionData.accessToken,
        refreshToken: connectionData.refreshToken,
        isConnected: connectionData.isConnected,
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Retrieve Google connection information for a user
   * @param userId - The user's database ID
   * @returns Promise<GoogleConnection | null> - The connection object or null if not found
   */
  async getGoogleConnection(userId: string) {
    return await this.prisma.googleConnection.findUnique({
      where: { userId }
    })
  }

  /**
   * Update the last Drive sync timestamp for a user
   * @param userId - The user's database ID
   * @returns Promise<GoogleConnection> - The updated connection object
   */
  async updateDriveSyncTime(userId: string) {
    return await this.prisma.googleConnection.update({
      where: { userId },
      data: {
        lastDriveSyncAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Update the last Calendar sync timestamp for a user
   * @param userId - The user's database ID
   * @returns Promise<GoogleConnection> - The updated connection object
   */
  async updateCalendarSyncTime(userId: string) {
    return await this.prisma.googleConnection.update({
      where: { userId },
      data: {
        lastCalendarSyncAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Create or update a document record in the database
   * @param docData - Document metadata including drive ID, name, type, and other properties
   * @returns Promise<DocumentRecord> - The created or updated document record
   */
  async upsertDocument(docData: DocumentData): Promise<DocumentRecord> {
    const doc = await this.prisma.document.upsert({
      where: { driveId: docData.driveId },
      update: {
        name: docData.name,
        mimeType: docData.mimeType,
        modifiedTime: docData.modifiedTime,
        size: docData.size,
        webViewLink: docData.webViewLink,
        updatedAt: new Date(),
      },
      create: {
        driveId: docData.driveId,
        name: docData.name,
        mimeType: docData.mimeType,
        modifiedTime: docData.modifiedTime,
        size: docData.size,
        webViewLink: docData.webViewLink,
        userId: docData.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return {
      id: doc.id,
      driveId: doc.driveId,
      name: doc.name,
      mimeType: doc.mimeType,
      modifiedTime: doc.modifiedTime,
      size: doc.size || undefined,
      webViewLink: doc.webViewLink || undefined,
      userId: doc.userId
    }
  }

  /**
   * Retrieve all documents for a specific user
   * @param userId - The user's database ID
   * @returns Promise<DocumentRecord[]> - Array of document records
   */
  async getDocuments(userId: string): Promise<DocumentRecord[]> {
    const docs = await this.prisma.document.findMany({
      where: { userId },
      orderBy: { modifiedTime: 'desc' }
    })

    return docs.map((doc: any) => ({
      id: doc.id,
      driveId: doc.driveId,
      name: doc.name,
      mimeType: doc.mimeType,
      modifiedTime: doc.modifiedTime,
      size: doc.size || undefined,
      webViewLink: doc.webViewLink || undefined,
      userId: doc.userId
    }))
  }

  /**
   * Store document embedding for vector search
   * @param embeddingData - Embedding information including content, vector, and metadata
   * @returns Promise<any> - The created embedding record
   */
  async storeDocumentEmbedding(embeddingData: EmbeddingData) {
    return await this.prisma.documentEmbedding.create({
      data: {
        fileId: embeddingData.fileId,
        fileName: embeddingData.fileName,
        content: embeddingData.content,
        embedding: JSON.stringify(embeddingData.embedding),
        metadata: embeddingData.metadata ? JSON.stringify(embeddingData.metadata) : null,
        chunkIndex: embeddingData.chunkIndex || 0,
        userId: embeddingData.userId,
        createdAt: new Date(),
      },
    })
  }

  /**
   * Retrieve all document embeddings for a user
   * @param userId - The user's database ID
   * @returns Promise<DocumentEmbedding[]> - Array of document embeddings
   */
  async getDocumentEmbeddings(userId: string): Promise<DocumentEmbedding[]> {
    const embeddings = await this.prisma.documentEmbedding.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    return embeddings.map((embedding: any) => ({
      id: embedding.id,
      fileId: embedding.fileId,
      fileName: embedding.fileName,
      content: embedding.content,
      embedding: JSON.parse(embedding.embedding),
      metadata: embedding.metadata ? JSON.parse(embedding.metadata) : undefined,
      chunkIndex: embedding.chunkIndex,
      userId: embedding.userId
    }))
  }

  /**
   * Search for similar document embeddings using vector similarity
   * @param userId - The user's database ID
   * @param queryEmbedding - The query vector to search against
   * @param limit - Maximum number of results to return (default: 5)
   * @returns Promise<Array<DocumentEmbedding & { similarity: number }>> - Similar embeddings with similarity scores
   */
  async searchEmbeddings(userId: string, queryEmbedding: number[], limit: number = 5) {
    // Maybe use Pinecone (for vector database)
    const embeddings = await this.getDocumentEmbeddings(userId)
    
    const similarities = embeddings.map(embedding => {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding.embedding)
      return { ...embedding, similarity }
    })

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param a - First vector
   * @param b - Second vector
   * @returns number - Cosine similarity score between -1 and 1
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }

  /**
   * Get cleanup candidates for file organization
   * @param userId - The user's database ID
   * @param maxFiles - Maximum number of candidates to return (default: 50)
   * @returns Promise<CleanupCandidate[]> - Array of cleanup candidates with analysis
   */
  async getCleanupCandidates(userId: string, maxFiles: number = 50): Promise<CleanupCandidate[]> {
    // Get small files
    const smallFiles = await this.prisma.document.findMany({
      where: {
        userId,
        size: { lte: 10240 } // 10KB
      },
      take: 20,
      orderBy: { size: 'asc' }
    })

    // Get untitled files
    const untitledFiles = await this.prisma.document.findMany({
      where: {
        userId,
        name: { contains: 'Untitled' }  // Removed mode: 'insensitive'
      },
      take: 15
    })

    // Get test/temp files
    const testFiles = await this.prisma.document.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: 'test' } },      // Removed mode: 'insensitive'
          { name: { contains: 'temp' } },     // Removed mode: 'insensitive'
          { name: { contains: 'draft' } },    // Removed mode: 'insensitive'
          { name: { startsWith: 'Copy of' } }
        ]
      },
      take: 15
    })

    // Get old files
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    const oldFiles = await this.prisma.document.findMany({
      where: {
        userId,
        modifiedTime: { lt: sixMonthsAgo },
        size: { lte: 51200 } // 50KB
      },
      take: 15,
      orderBy: { modifiedTime: 'asc' }
    })

    // Combine and analyze
    const allFiles = [...smallFiles, ...untitledFiles, ...testFiles, ...oldFiles]
    
    // Remove duplicates
    const uniqueFiles = allFiles.filter((file, index, self) => 
      index === self.findIndex(f => f.driveId === file.driveId)
    )

    return uniqueFiles.map(file => this.analyzeFileForCleanup(file)).slice(0, maxFiles)
  }

  /**
   * Analyze a file to determine if it's a cleanup candidate
   * @param file - The file record to analyze
   * @returns CleanupCandidate - Analysis result with category, reason, and confidence
   */
  private analyzeFileForCleanup(file: any): CleanupCandidate {
    const fileName = file.name || ''
    const fileSize = file.size || 0

    let category: CleanupCandidate['category'] = 'small'
    let reason = ''
    let confidence: CleanupCandidate['confidence'] = 'medium'

    // Tiny files
    if (fileSize <= 1024) {
      category = 'tiny'
      reason = `Tiny file (${this.formatFileSize(fileSize)})`
      confidence = 'high'
    }
    // Small files
    else if (fileSize <= 5120) {
      category = 'small'
      reason = `Small file (${this.formatFileSize(fileSize)}) - worth reviewing`
      confidence = 'medium'
    }
    // Untitled files
    else if (fileName.toLowerCase().includes('untitled')) {
      category = 'small'
      reason = `Untitled document (${this.formatFileSize(fileSize)}) - likely test/draft`
      confidence = 'medium'
    }
    // Test/temp files
    else if (this.isTestFile(fileName)) {
      category = 'small'
      reason = `Test/temporary file (${this.formatFileSize(fileSize)})`
      confidence = 'medium'
    }
    // Old files
    else {
      const ageInMonths = (Date.now() - new Date(file.modifiedTime).getTime()) / (1000 * 60 * 60 * 24 * 30)
      if (ageInMonths > 6) {
        category = 'old'
        reason = `Old file (${Math.floor(ageInMonths)} months old, ${this.formatFileSize(fileSize)})`
        confidence = 'low'
      }
    }

    return {
      id: file.driveId,
      name: fileName,
      mimeType: file.mimeType,
      size: fileSize,
      modifiedTime: file.modifiedTime.toISOString(),
      webViewLink: file.webViewLink,
      category,
      reason,
      confidence,
      selected: false
    }
  }

  /**
   * Check if a filename matches test/temporary file patterns
   * @param filename - The filename to check
   * @returns boolean - True if the file appears to be a test/temporary file
   */
  private isTestFile(filename: string): boolean {
    const testPatterns = [
      /test/i, /temp/i, /draft/i, /^Copy of/i, /backup/i
    ]
    return testPatterns.some(pattern => pattern.test(filename))
  }

  /**
   * Format file size in human-readable format
   * @param bytes - File size in bytes
   * @returns string - Formatted file size string
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /**
   * Create a new chat session
   * @param userId - The user's database ID
   * @param summary - A summary description of the chat
   * @returns Promise<any> - The created chat record
   */
  async createChat(userId: string, summary: string) {
    return await this.prisma.chat.create({
      data: {
        summary,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Retrieve all chats for a user
   * @param userId - The user's database ID
   * @returns Promise<any[]> - Array of chat records with first message
   */
  async getChats(userId: string) {
    return await this.prisma.chat.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
  }

  /**
   * Save a message to a chat session
   * @param chatId - The chat session ID
   * @param messageData - Message content and metadata
   * @returns Promise<any> - The created message record
   */
  async saveMessage(chatId: string, messageData: MessageData) {
    return await this.prisma.message.create({
      data: {
        content: messageData.content,
        sender: messageData.sender,
        images: messageData.images ? JSON.stringify(messageData.images) : null,
        driveContext: messageData.driveContext ? JSON.stringify(messageData.driveContext) : null,
        timestamp: new Date(),
        chatId,
      },
    })
  }

  /**
   * Log cleanup activity for analytics
   * @param userId - The user's database ID
   * @param activityData - Cleanup activity statistics
   * @returns Promise<any> - The created activity record
   */
  async logCleanupActivity(userId: string, activityData: CleanupActivityData) {
    return await this.prisma.cleanupActivity.create({
      data: {
        userId,
        filesDeleted: activityData.filesDeleted,
        filesRequested: activityData.filesRequested,
        errors: activityData.errors,
        deletedFileNames: JSON.stringify(activityData.deletedFileNames),
        timestamp: new Date(),
      },
    })
  }

  /**
   * Log organization activity for analytics
   * @param userId - The user's database ID
   * @param activityData - Organization activity statistics
   * @returns Promise<any> - The created activity record
   */
  async logOrganizationActivity(userId: string, activityData: OrganizationActivityData) {
    return await this.prisma.organizationActivity.create({
      data: {
        userId,
        clusterName: activityData.clusterName,
        folderName: activityData.folderName,
        filesMoved: activityData.filesMoved,
        method: activityData.method,
        confidence: activityData.confidence,
        metadata: activityData.metadata ? JSON.stringify(activityData.metadata) : null,
        timestamp: new Date(),
      },
    })
  }

  /**
   * Disconnect from the database
   */
  async disconnect() {
    await this.prisma.$disconnect()
  }
} 