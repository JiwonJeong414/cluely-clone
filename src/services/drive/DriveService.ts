// src/services/drive/DriveService.ts
import { google } from 'googleapis'
// @ts-ignore
import { AuthService } from '../auth/AuthService.js'
import type { User } from '../auth/AuthService.js'
import { DatabaseService } from '../../database/DatabaseService'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size?: string
  webViewLink?: string
  ownedByMe?: boolean
}

export interface SyncProgress {
  totalFiles: number
  processedFiles: number
  currentFile: string
  embeddingsCreated: number
  skipped: number
  errors: number
  isComplete: boolean
}

export class DriveService {
  private static instance: DriveService
  private authService: AuthService
  private db: DatabaseService
  private drive: any

  private constructor() {
    this.authService = AuthService.getInstance()
    this.db = DatabaseService.getInstance()
  }

  static getInstance(): DriveService {
    if (!DriveService.instance) {
      DriveService.instance = new DriveService()
    }
    return DriveService.instance
  }

  private initializeDrive() {
    const oauth2Client = this.authService.getOAuthClient()
    this.drive = google.drive({ version: 'v3', auth: oauth2Client })
  }

  async listFiles(options: {
    pageSize?: number
    orderBy?: string
    q?: string
  } = {}): Promise<DriveFile[]> {
    if (!this.drive) this.initializeDrive()

    try {
      const response = await this.drive.files.list({
        pageSize: options.pageSize || 100,
        orderBy: options.orderBy || 'modifiedTime desc',
        q: options.q || 'trashed=false',
        fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink,ownedByMe)'
      })

      return response.data.files || []
    } catch (error) {
      console.error('Error listing files:', error)
      throw error
    }
  }

  async getFileContent(fileId: string): Promise<string> {
    if (!this.drive) this.initializeDrive()

    try {
      const file = await this.drive.files.get({
        fileId,
        fields: 'mimeType'
      })

      const mimeType = file.data.mimeType

      let response
      if (mimeType === 'application/vnd.google-apps.document') {
        response = await this.drive.files.export({
          fileId,
          mimeType: 'text/plain'
        })
      } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        response = await this.drive.files.export({
          fileId,
          mimeType: 'text/csv'
        })
      } else if (mimeType === 'application/vnd.google-apps.presentation') {
        response = await this.drive.files.export({
          fileId,
          mimeType: 'text/plain'
        })
      } else if (mimeType === 'text/plain') {
        response = await this.drive.files.get({
          fileId,
          alt: 'media'
        })
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`)
      }

      return response.data || ''
    } catch (error) {
      console.error(`Error getting content for file ${fileId}:`, error)
      throw error
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.drive) this.initializeDrive()

    try {
      await this.drive.files.delete({ fileId })
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error)
      throw error
    }
  }

  async createFolder(name: string): Promise<string> {
    if (!this.drive) this.initializeDrive()

    try {
      const response = await this.drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder'
        }
      })

      return response.data.id
    } catch (error) {
      console.error(`Error creating folder ${name}:`, error)
      throw error
    }
  }

  async moveFileToFolder(fileId: string, folderId: string): Promise<void> {
    if (!this.drive) this.initializeDrive()

    try {
      // Get current parents
      const file = await this.drive.files.get({
        fileId,
        fields: 'parents'
      })

      const previousParents = file.data.parents?.join(',') || ''

      // Move to new folder
      await this.drive.files.update({
        fileId,
        addParents: folderId,
        removeParents: previousParents
      })
    } catch (error) {
      console.error(`Error moving file ${fileId} to folder ${folderId}:`, error)
      throw error
    }
  }

  async createShortcut(fileId: string, folderId: string, fileName: string): Promise<void> {
    if (!this.drive) this.initializeDrive()

    try {
      await this.drive.files.create({
        requestBody: {
          name: `${fileName} (Organized)`,
          parents: [folderId],
          mimeType: 'application/vnd.google-apps.shortcut',
          shortcutDetails: {
            targetId: fileId
          }
        }
      })
    } catch (error) {
      console.error(`Error creating shortcut for file ${fileId}:`, error)
      throw error
    }
  }

  async syncFiles(
    onProgress?: (progress: SyncProgress) => void,
    limit: number = 10
  ): Promise<{
    totalFiles: number
    processedFiles: number
    embeddingCount: number
    skippedCount: number
    errorCount: number
  }> {
    const user = this.authService.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    console.log(`🚀 Starting sync for user ${user.id} - targeting ${limit} documents`)

    let processedCount = 0
    let embeddingCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Get existing embeddings
    const existingEmbeddings = await this.db.getDocumentEmbeddings(user.id)
    const processedFileIds = new Set(existingEmbeddings.map(doc => doc.fileId))

    // Get recent files first
    const recentFiles = await this.listFiles({
      pageSize: limit * 3,
      orderBy: 'modifiedTime desc'
    })

    const processableFiles = recentFiles.filter(file => 
      file.mimeType && this.shouldProcessFile(file.mimeType)
    )

    const unprocessedFiles = processableFiles.filter(file => 
      !processedFileIds.has(file.id)
    ).slice(0, limit)

    if (unprocessedFiles.length === 0) {
      return {
        totalFiles: processableFiles.length,
        processedFiles: 0,
        embeddingCount: 0,
        skippedCount: 0,
        errorCount: 0
      }
    }

    for (let i = 0; i < unprocessedFiles.length; i++) {
      const file = unprocessedFiles[i]
      
      if (onProgress) {
        onProgress({
          totalFiles: unprocessedFiles.length,
          processedFiles: i,
          currentFile: file.name,
          embeddingsCreated: embeddingCount,
          skipped: skippedCount,
          errors: errorCount,
          isComplete: false
        })
      }

      try {
        console.log(`📁 Processing ${i + 1}/${unprocessedFiles.length}: ${file.name}`)

        // Update file record
        await this.db.upsertDocument({
          driveId: file.id,
          name: file.name,
          mimeType: file.mimeType,
          modifiedTime: new Date(file.modifiedTime),
          size: file.size ? parseInt(file.size) : undefined,
          webViewLink: file.webViewLink,
          userId: user.id
        })

        // Get content and create embeddings
        try {
          const content = await this.getFileContent(file.id)
          
          if (content && content.trim().length > 20) {
            // Create embeddings using VectorService
            const VectorService = (await import('../vector/VectorService')).VectorService
            const vectorService = VectorService.getInstance()
            await vectorService.storeDocumentEmbeddings(
              user.id,
              file.id,
              file.name,
              content
            )
            embeddingCount++
            console.log(`✅ Successfully processed ${file.name}`)
          } else {
            console.log(`⚠️ Insufficient content in ${file.name} - skipping`)
            skippedCount++
          }
        } catch (embeddingError) {
          console.error(`❌ Failed to create embeddings for ${file.name}:`, embeddingError)
          errorCount++
        }

        processedCount++
      } catch (error) {
        console.error(`💥 ERROR processing file ${file.id} (${file.name}):`, error)
        errorCount++
      }
    }

    // Update sync time
    await this.db.updateDriveSyncTime(user.id)

    if (onProgress) {
      onProgress({
        totalFiles: unprocessedFiles.length,
        processedFiles: processedCount,
        currentFile: '',
        embeddingsCreated: embeddingCount,
        skipped: skippedCount,
        errors: errorCount,
        isComplete: true
      })
    }

    return {
      totalFiles: unprocessedFiles.length,
      processedFiles: processedCount,
      embeddingCount,
      skippedCount,
      errorCount
    }
  }

  private shouldProcessFile(mimeType: string): boolean {
    const supportedTypes = [
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      'text/plain'
    ]
    
    return supportedTypes.includes(mimeType)
  }

  async searchDocuments(query: string, limit: number = 5) {
    const user = this.authService.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const VectorService = (await import('../vector/VectorService')).VectorService
    const vectorService = VectorService.getInstance()
    return vectorService.searchSimilarDocuments(user.id, query, limit)
  }
}