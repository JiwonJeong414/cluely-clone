/**
 * Drive Service
 * 
 * Handles Google Drive integration for file management, synchronization,
 * and content extraction. Provides functionality for listing files, extracting
 * content, creating embeddings, and managing file organization.
 */

import { google } from 'googleapis'
import { AuthService } from '../auth/AuthService.js'
import { DatabaseService } from '../database/DatabaseService'
import type { User, DriveFile, SyncProgress, SyncOptions } from '../../types'

export class DriveService {
  private static instance: DriveService
  private authService: AuthService
  private db: DatabaseService
  private drive: any

  private constructor() {
    this.authService = AuthService.getInstance()
    this.db = DatabaseService.getInstance()
  }

  /**
   * Get the singleton instance of DriveService
   * @returns DriveService - The singleton instance
   */
  static getInstance(): DriveService {
    if (!DriveService.instance) {
      DriveService.instance = new DriveService()
    }
    return DriveService.instance
  }

  /**
   * Initialize the Google Drive API client
   * Sets up the drive API with OAuth2 authentication
   */
  private initializeDrive() {
    const oauth2Client = this.authService.getOAuthClient()
    this.drive = google.drive({ version: 'v3', auth: oauth2Client })
  }

  /**
   * List files from Google Drive with optional filtering
   * @param options - Query options including page size, ordering, and filters
   * @returns Promise<DriveFile[]> - Array of drive files
   * @throws {Error} If drive API call fails
   */
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

  /**
   * Get the content of a file from Google Drive
   * Supports various file types including Google Docs, Sheets, and text files
   * @param fileId - The Google Drive file ID
   * @returns Promise<string> - The file content as text
   * @throws {Error} If file content extraction fails or file type is unsupported
   */
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

  /**
   * Delete a file from Google Drive
   * @param fileId - The Google Drive file ID to delete
   * @returns Promise<void>
   * @throws {Error} If file deletion fails
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.drive) this.initializeDrive()

    try {
      await this.drive.files.delete({ fileId })
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error)
      throw error
    }
  }

  /**
   * Create a new folder in Google Drive
   * @param name - The name of the folder to create
   * @returns Promise<string> - The ID of the created folder
   * @throws {Error} If folder creation fails
   */
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

  /**
   * Move a file to a different folder in Google Drive
   * @param fileId - The ID of the file to move
   * @param folderId - The ID of the destination folder
   * @returns Promise<void>
   * @throws {Error} If file move operation fails
   */
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

  /**
   * Create a shortcut to a file in a specified folder
   * @param fileId - The ID of the target file
   * @param folderId - The ID of the folder where the shortcut will be created
   * @param fileName - The name for the shortcut
   * @returns Promise<void>
   * @throws {Error} If shortcut creation fails
   */
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

  /**
   * Synchronize files from Google Drive with the local database
   * Creates embeddings for new or updated files for search functionality
   * @param onProgress - Optional callback for progress updates
   * @param options - Sync configuration options
   * @returns Promise<{ success: boolean, totalFiles: number, processedFiles: number, embeddingCount: number, skippedCount: number, errorCount: number, strategy: string, message: string }> - Sync results
   * @throws {Error} If user is not authenticated or sync fails
   */
  async syncFiles(
    onProgress?: (progress: SyncProgress) => void,
    options: SyncOptions = {}
  ): Promise<{
    success: boolean
    totalFiles: number
    processedFiles: number
    embeddingCount: number
    skippedCount: number
    errorCount: number
    strategy: string
    message: string
  }> {
    const user = this.authService.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    if (!this.drive) this.initializeDrive()

    const { 
      limit = 10, 
      force = false, 
      strategy = force ? 'force_reindex' : 'new_files_only' 
    } = options

    console.log(`🚀 Starting ${strategy} sync for user ${user.id} - targeting ${limit} documents`)

    let processedCount = 0
    let embeddingCount = 0
    let skippedCount = 0
    let errorCount = 0
    let totalFilesFound = 0
    let processableFilesFound = 0

    // Get existing embeddings (files that have been processed for embeddings)
    const existingEmbeddings = await this.db.getDocumentEmbeddings(user.id)
    const processedFileIds = new Set(existingEmbeddings.map(doc => doc.fileId))
    console.log(`📊 Currently processed files: ${processedFileIds.size}`)

    let filesToProcess: DriveFile[] = []

    // STRATEGY 1: Force reindex mode
    if (strategy === 'force_reindex' || force) {
      console.log(`🔄 Force reindex mode: fetching first ${limit} processable files`)
      
      // Get any files, limited count
      const someFiles = await this.listFiles({
        pageSize: Math.min(limit * 3, 100), // Get 3x target to account for non-processable files
        orderBy: 'modifiedTime desc' // Get most recently modified first
      })
      
      const processableFiles = someFiles.filter(file => 
        file.mimeType && this.shouldProcessFile(file.mimeType)
      )
      filesToProcess = processableFiles.slice(0, limit)
      totalFilesFound = someFiles.length
      processableFilesFound = processableFiles.length
      
      console.log(`🔄 Found ${filesToProcess.length} files to force reindex`)
      
    } else {
      // STRATEGY 2: New files only mode (default)
      console.log(`🆕 Normal mode: searching for new files to process`)
      
      // Get recently modified files first (most likely to be new)
      const recentFiles = await this.listFiles({
        pageSize: Math.min(limit * 5, 200), // Get more to find unprocessed ones
        orderBy: 'modifiedTime desc',
        q: 'trashed=false' // Only non-trashed files
      })
      
      totalFilesFound = recentFiles.length
      const processableFiles = recentFiles.filter(file => 
        file.mimeType && this.shouldProcessFile(file.mimeType)
      )
      processableFilesFound = processableFiles.length
      
      // Filter out already processed files
      const unprocessedFiles = processableFiles.filter(file => 
        file.id && !processedFileIds.has(file.id)
      )
      filesToProcess = unprocessedFiles.slice(0, limit)
      
      console.log(`Recent files scan: ${totalFilesFound} total, ${processableFiles.length} processable, ${unprocessedFiles.length} unprocessed`)
      
      // If we don't have enough from recent files, try a broader targeted search
      if (filesToProcess.length < limit && filesToProcess.length < unprocessedFiles.length) {
        console.log(` Not enough recent files, searching more broadly...`)
        
        // Search for specific document types to be more targeted
        const docTypes = [
          'application/vnd.google-apps.document',
          'application/vnd.google-apps.spreadsheet', 
          'application/vnd.google-apps.presentation'
        ]
        
        for (const mimeType of docTypes) {
          if (filesToProcess.length >= limit) break
          
          const typeFiles = await this.listFiles({
            pageSize: 50,
            q: `mimeType='${mimeType}' and trashed=false`,
            orderBy: 'modifiedTime desc'
          })
          
          const newUnprocessed = typeFiles.filter(file => 
            file.id && !processedFileIds.has(file.id) && 
            !filesToProcess.some(f => f.id === file.id)
          )
          
          filesToProcess.push(...newUnprocessed.slice(0, limit - filesToProcess.length))
          console.log(`[✓] Found ${newUnprocessed.length} new ${mimeType.split('.').pop()} files`)
        }
      }
      
      // Early return if no new files found
      if (filesToProcess.length === 0) {
        return {
          success: true,
          totalFiles: totalFilesFound,
          processedFiles: 0,
          embeddingCount: 0,
          skippedCount: 0,
          errorCount: 0,
          strategy: 'new_files_only',
          message: 'All recent files have already been indexed! Your Drive is up to date.'
        }
      }
    }

    // Process the selected files
    console.log(`Processing ${filesToProcess.length} selected files...`)

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i]
      
      if (onProgress) {
        onProgress({
          totalFiles: filesToProcess.length,
          processedFiles: i,
          currentFile: file.name,
          embeddingsCreated: embeddingCount,
          skipped: skippedCount,
          errors: errorCount,
          isComplete: false
        })
      }

      try {
        console.log(`\n📁 Processing ${i + 1}/${filesToProcess.length}: ${file.name}`)
        console.log(`   File ID: ${file.id}`)
        console.log(`   File Type: ${file.mimeType}`)

        // Update file record in documents table
        await this.db.upsertDocument({
          driveId: file.id,
          name: file.name,
          mimeType: file.mimeType,
          modifiedTime: new Date(file.modifiedTime),
          size: file.size ? parseInt(file.size) : undefined,
          webViewLink: file.webViewLink,
          userId: user.id
        })

        // Handle embeddings
        if (force) {
          // In force mode, delete existing embeddings first
          const existingCount = existingEmbeddings.filter(e => e.fileId === file.id).length
          if (existingCount > 0) {
            // Note: You'll need to add this method to DatabaseService
            // await this.db.deleteDocumentEmbeddings(file.id, user.id)
            console.log(`Would delete ${existingCount} existing embeddings for force reindex`)
          }
        }

        // Create embeddings using VectorService
        try {
          console.log(` Extracting content from ${file.name}...`)
          const content = await this.getFileContent(file.id)
          
          // More lenient content check - even metadata is useful for search
          if (content && content.trim().length > 20) {
            console.log(` Creating embeddings for ${file.name} (${content.length} chars)...`)
            
            // Import VectorService dynamically
            const VectorService = (await import('../vector/VectorService')).VectorService
            const vectorService = VectorService.getInstance()
            
            await vectorService.storeDocumentEmbeddings(
              user.id,
              file.id,
              file.name,
              content
            )
            
            embeddingCount++
            console.log(` [✓] Successfully processed ${file.name}`)
          } else {
            console.log(`Insufficient content in ${file.name} (${content?.length || 0} chars) - skipping`)
            skippedCount++
          }
        } catch (embeddingError) {
          console.error(`Failed to create embeddings for ${file.name}:`, embeddingError)
          errorCount++
        }

        processedCount++
      } catch (error) {
        console.error(`ERROR processing file ${file.id} (${file.name}):`, error)
        errorCount++
      }
    }

    // Update sync time
    await this.db.updateDriveSyncTime(user.id)

    // Final progress update
    if (onProgress) {
      onProgress({
        totalFiles: filesToProcess.length,
        processedFiles: processedCount,
        currentFile: '',
        embeddingsCreated: embeddingCount,
        skipped: skippedCount,
        errors: errorCount,
        isComplete: true
      })
    }

    const message = `Sync completed! Successfully indexed ${embeddingCount} documents.`
    
    console.log('🎉 Sync completed successfully:', {
      embeddingCount,
      skippedCount,
      errorCount,
      strategy
    })

    return {
      success: true,
      totalFiles: filesToProcess.length,
      processedFiles: processedCount,
      embeddingCount,
      skippedCount,
      errorCount,
      strategy,
      message
    }
  }

  /**
   * Check if a file type should be processed for embeddings
   * @param mimeType - The MIME type of the file
   * @returns boolean - True if the file type is supported for processing
   */
  private shouldProcessFile(mimeType: string): boolean {
    const supportedTypes = [
      'application/vnd.google-apps.document',      // Google Docs - FULL TEXT
      'application/vnd.google-apps.spreadsheet',  // Google Sheets - FULL TEXT  
      'application/vnd.google-apps.presentation', // Google Slides - FULL TEXT
      'text/plain',                               // Text files - FULL TEXT
      'application/pdf',                          // PDFs (if you want to add support)
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ]
    
    return supportedTypes.includes(mimeType)
  }

  /**
   * Search documents using vector similarity
   * @param query - Search query string
   * @param limit - Maximum number of results to return (default: 5)
   * @returns Promise<any[]> - Array of similar documents with relevance scores
   * @throws {Error} If user is not authenticated
   */
  async searchDocuments(query: string, limit: number = 5) {
    const user = this.authService.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const VectorService = (await import('../vector/VectorService')).VectorService
    const vectorService = VectorService.getInstance()
    return vectorService.searchSimilarDocuments(user.id, query, limit)
  }

  /**
   * Force sync all files, reindexing existing files
   * @param onProgress - Optional callback for progress updates
   * @param limit - Maximum number of files to process (default: 10)
   * @returns Promise<any> - Sync results
   */
  async forceSyncFiles(onProgress?: (progress: SyncProgress) => void, limit: number = 10) {
    return this.syncFiles(onProgress, { limit, force: true, strategy: 'force_reindex' })
  }

  /**
   * Sync only new files that haven't been indexed yet
   * @param onProgress - Optional callback for progress updates
   * @param limit - Maximum number of files to process (default: 10)
   * @returns Promise<any> - Sync results
   */
  async syncNewFiles(onProgress?: (progress: SyncProgress) => void, limit: number = 10) {
    return this.syncFiles(onProgress, { limit, force: false, strategy: 'new_files_only' })
  }

  /**
   * Get detailed information about a specific file
   * @param fileId - The Google Drive file ID
   * @returns Promise<any> - File metadata
   * @throws {Error} If file info retrieval fails
   */
  async getFileInfo(fileId: string) {
    if (!this.drive) this.initializeDrive()

    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id,name,mimeType,modifiedTime,size,webViewLink,ownedByMe'
      })
      return response.data
    } catch (error) {
      console.error(`Error getting file info for ${fileId}:`, error)
      throw error
    }
  }

  /**
   * Get synchronization statistics for a user
   * @param userId - The user's database ID
   * @returns Promise<any> - Sync statistics including document counts and last sync time
   */
  async getSyncStats(userId: string) {
    const embeddings = await this.db.getDocumentEmbeddings(userId)
    const documents = await this.db.getDocuments(userId)
    
    // Group by fileId to get unique files
    const uniqueEmbeddingFiles = new Set(embeddings.map(e => e.fileId))
    
    return {
      totalDocuments: documents.length,
      indexedFiles: uniqueEmbeddingFiles.size,
      totalEmbeddings: embeddings.length,
      averageEmbeddingsPerFile: embeddings.length / Math.max(uniqueEmbeddingFiles.size, 1),
      lastSyncTime: await this.getLastSyncTime(userId)
    }
  }

  /**
   * Get the last Drive sync timestamp for a user
   * @param userId - The user's database ID
   * @returns Promise<Date | undefined> - Last sync timestamp or undefined if never synced
   */
  private async getLastSyncTime(userId: string) {
    const connection = await this.db.getGoogleConnection(userId)
    return connection?.lastDriveSyncAt
  }
}