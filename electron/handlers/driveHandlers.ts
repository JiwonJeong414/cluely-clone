import { ipcMain, BrowserWindow } from 'electron'
import { DriveService } from '../../src/services/drive/DriveService'
import { DatabaseService } from '../../src/services/database/DatabaseService'
import { AuthService } from '../../src/services/auth/AuthService'

export function setupDriveHandlers(
  driveService: DriveService, 
  dbService: DatabaseService, 
  mainWindow: BrowserWindow | null
) {
  const authService = AuthService.getInstance()

  // Drive sync handler
  ipcMain.handle('drive-sync', async (event, options = {}) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log('Starting enhanced Drive sync...')
      
      const { limit = 10, force = false, strategy = 'new_files_only' } = options

      const result = await driveService.syncFiles(
        (progress) => {
          if (mainWindow) {
            mainWindow.webContents.send('drive-sync-progress', progress)
          }
        },
        { limit, force, strategy }
      )
      
      console.log('[✓] Enhanced Drive sync completed:', result)
      return { success: true, result }
    } catch (error) {
      console.error('Enhanced Drive sync error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync failed' 
      }
    }
  })

  // Force sync handler
  ipcMain.handle('drive-sync-force', async (event, options = {}) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log('Starting force sync...')
      
      const result = await driveService.forceSyncFiles(
        (progress) => {
          if (mainWindow) {
            mainWindow.webContents.send('drive-sync-progress', progress)
          }
        },
        options.limit || 10
      )
      
      console.log('[✓] Force sync completed:', result)
      return { success: true, result }
    } catch (error) {
      console.error('Force sync error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Force sync failed' 
      }
    }
  })

  // New files sync handler
  ipcMain.handle('drive-sync-new', async (event, options = {}) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log('Starting new files sync...')
      
      const result = await driveService.syncNewFiles(
        (progress) => {
          if (mainWindow) {
            mainWindow.webContents.send('drive-sync-progress', progress)
          }
        },
        options.limit || 10
      )
      
      console.log('[✓] New files sync completed:', result)
      return { success: true, result }
    } catch (error) {
      console.error('New files sync error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'New files sync failed' 
      }
    }
  })

  // Get sync stats
  ipcMain.handle('drive-get-sync-stats', async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      const stats = await driveService.getSyncStats(user.id)
      return { success: true, stats }
    } catch (error) {
      console.error('Get sync stats error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Get stats failed' 
      }
    }
  })

  // Drive search
  ipcMain.handle('drive-search', async (event, query, limit = 5) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log(`Searching Drive for: "${query}"`)
      
      const results = await driveService.searchDocuments(query, limit)
      
      console.log(`[✓] Found ${results.length} results`)
      return { success: true, results }
    } catch (error) {
      console.error(' Drive search error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed' 
      }
    }
  })

  // List files
  ipcMain.handle('drive-list-files', async (event, options = {}) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      const files = await driveService.listFiles(options)
      return { success: true, files }
    } catch (error) {
      console.error('Drive list files error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'List files failed' 
      }
    }
  })

  // Delete single file
  ipcMain.handle('drive-delete-file', async (event, fileId) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      await driveService.deleteFile(fileId)
      console.log(`[✓] Deleted file: ${fileId}`)
      return { success: true }
    } catch (error) {
      console.error(`Drive delete file error:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delete failed' 
      }
    }
  })

  // Delete multiple files
  ipcMain.handle('drive-delete-files', async (event, fileIds) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      const results = []
      let successCount = 0
      let errorCount = 0
      
      for (const fileId of fileIds) {
        try {
          await driveService.deleteFile(fileId)
          results.push({ fileId, success: true })
          successCount++
        } catch (error) {
          results.push({ 
            fileId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Delete failed' 
          })
          errorCount++
        }
      }
      
      // Log cleanup activity
      await dbService.logCleanupActivity(user.id, {
        filesDeleted: successCount,
        filesRequested: fileIds.length,
        errors: errorCount,
        deletedFileNames: fileIds
      })
      
      console.log(`[✓] Deleted ${successCount}/${fileIds.length} files`)
      return { 
        success: true, 
        results,
        summary: { total: fileIds.length, deleted: successCount, errors: errorCount }
      }
    } catch (error) {
      console.error('Drive delete files error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Bulk delete failed' 
      }
    }
  })

  // Create folder
  ipcMain.handle('drive-create-folder', async (event, name) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      const folderId = await driveService.createFolder(name)
      console.log(`[✓] Created folder: ${name} (${folderId})`)
      return { success: true, folderId }
    } catch (error) {
      console.error('Drive create folder error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Create folder failed' 
      }
    }
  })

  // Move file to folder
  ipcMain.handle('drive-move-file', async (event, fileId, folderId) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      await driveService.moveFileToFolder(fileId, folderId)
      console.log(`[✓] Moved file ${fileId} to folder ${folderId}`)
      return { success: true }
    } catch (error) {
      console.error('Drive move file error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Move file failed' 
      }
    }
  })

  // Database handlers
  ipcMain.handle('db-get-indexed-files', async () => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      const VectorService = (await import('../../src/services/vector/VectorService')).VectorService
      const vectorService = VectorService.getInstance()
      const files = await vectorService.getUserIndexedFiles(user.id)
      return { success: true, files }
    } catch (error) {
      console.error('Get indexed files error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Get indexed files failed' 
      }
    }
  })

  ipcMain.handle('db-get-cleanup-candidates', async (event, maxFiles = 50) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      const candidates = await dbService.getCleanupCandidates(user.id, maxFiles)
      return { success: true, candidates }
    } catch (error) {
      console.error('Get cleanup candidates error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Get cleanup candidates failed' 
      }
    }
  })
}