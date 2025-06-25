// src/services/database/DatabaseService.ts
import { PrismaClient } from '@prisma/client'
// @ts-ignore
// import { AuthService } from '../services/auth/AuthService.js'
import type { User } from '../services/auth/AuthService.js'

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

  async initialize() {
    try {
      // Run migrations if needed
      console.log('Initializing database...')
      
      // Test connection
      await this.prisma.$queryRaw`SELECT 1`
      console.log('✅ Database connected successfully')
    } catch (error) {
      console.error('❌ Database initialization failed:', error)
      throw error
    }
  }

  // User operations
  async upsertUser(userData: {
    uid: string
    email: string
    displayName: string
    photoURL?: string
  }): Promise<User> {
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

  // Drive connection operations
  async upsertDriveConnection(userId: string, connectionData: {
    accessToken: string
    refreshToken?: string
    isConnected: boolean
  }) {
    return await this.prisma.driveConnection.upsert({
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

  async getDriveConnection(userId: string) {
    return await this.prisma.driveConnection.findUnique({
      where: { userId }
    })
  }

  async updateDriveSyncTime(userId: string) {
    return await this.prisma.driveConnection.update({
      where: { userId },
      data: {
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  // Document operations
  async upsertDocument(docData: {
    driveId: string
    name: string
    mimeType: string
    modifiedTime: Date
    size?: number
    webViewLink?: string
    userId: string
  }): Promise<DocumentRecord> {
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

  // Document embedding operations
  async storeDocumentEmbedding(embeddingData: {
    fileId: string
    fileName: string
    content: string
    embedding: number[]
    metadata?: any
    chunkIndex?: number
    userId: string
  }) {
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

  async searchEmbeddings(userId: string, queryEmbedding: number[], limit: number = 5) {
    // Since SQLite doesn't have native vector operations, we'll fetch all embeddings
    // and do similarity search in memory (for production, consider using a vector database)
    const embeddings = await this.getDocumentEmbeddings(userId)
    
    const similarities = embeddings.map(embedding => {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding.embedding)
      return { ...embedding, similarity }
    })

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }

  // Cleanup operations
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

  private isTestFile(filename: string): boolean {
    const testPatterns = [
      /test/i, /temp/i, /draft/i, /^Copy of/i, /backup/i
    ]
    return testPatterns.some(pattern => pattern.test(filename))
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Chat operations
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

  async saveMessage(chatId: string, messageData: {
    content: string
    sender: string
    images?: string[]
    driveContext?: any[]
  }) {
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

  // Cleanup operations
  async logCleanupActivity(userId: string, activityData: {
    filesDeleted: number
    filesRequested: number
    errors: number
    deletedFileNames: string[]
  }) {
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

  // Organization operations
  async logOrganizationActivity(userId: string, activityData: {
    clusterName: string
    folderName: string
    filesMoved: number
    method: string
    confidence: number
    metadata?: any
  }) {
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

  async disconnect() {
    await this.prisma.$disconnect()
  }
}