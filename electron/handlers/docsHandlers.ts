import { ipcMain } from 'electron'
import { GoogleDocsService } from '../../src/services/docs/GoogleDocsService'
import { AuthService } from '../../src/services/auth/AuthService'

export function setupDocsHandlers(docsService: GoogleDocsService, authService: AuthService) {
  // Create a general note
  ipcMain.handle('docs-create-note', async (event, noteContent: any) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      console.log('📝 Creating Google Doc note...')
      const doc = await docsService.createNote(noteContent)
      
      console.log('✅ Google Doc note created successfully')
      return { success: true, doc }
    } catch (error) {
      console.error('❌ Create Google Doc note error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create Google Doc note' 
      }
    }
  })

  // Create screenshot note
  ipcMain.handle('docs-create-screenshot-note', async (event, title: string, screenshotUrl: string, aiAnalysis: string, userQuestion?: string) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      console.log('📸 Creating screenshot note in Google Docs...')
      const doc = await docsService.createScreenshotNote(title, screenshotUrl, aiAnalysis, userQuestion)
      
      console.log('✅ Screenshot note created successfully')
      return { success: true, doc }
    } catch (error) {
      console.error('❌ Create screenshot note error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create screenshot note' 
      }
    }
  })

  // Create audio note
  ipcMain.handle('docs-create-audio-note', async (event, title: string, transcription: string, aiAnalysis: string, audioDuration?: number) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      console.log('🎵 Creating audio note in Google Docs...')
      const doc = await docsService.createAudioNote(title, transcription, aiAnalysis, audioDuration)
      
      console.log('✅ Audio note created successfully')
      return { success: true, doc }
    } catch (error) {
      console.error('❌ Create audio note error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create audio note' 
      }
    }
  })

  // Create conversation note
  ipcMain.handle('docs-create-conversation-note', async (event, title: string, conversation: string, aiSummary?: string) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      console.log('💬 Creating conversation note in Google Docs...')
      const doc = await docsService.createConversationNote(title, conversation, aiSummary)
      
      console.log('✅ Conversation note created successfully')
      return { success: true, doc }
    } catch (error) {
      console.error('❌ Create conversation note error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create conversation note' 
      }
    }
  })

  // Append to existing note
  ipcMain.handle('docs-append-to-note', async (event, documentId: string, content: string) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      console.log('📝 Appending to Google Doc...')
      await docsService.appendToNote(documentId, content)
      
      console.log('✅ Content appended successfully')
      return { success: true }
    } catch (error) {
      console.error('❌ Append to note error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to append to note' 
      }
    }
  })

  // List recent documents
  ipcMain.handle('docs-list-recent', async (event, limit: number = 10) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      console.log('📚 Listing recent Google Docs...')
      const docs = await docsService.listRecentDocs(limit)
      
      console.log(`✅ Found ${docs.length} recent Google Docs`)
      return { success: true, docs }
    } catch (error) {
      console.error('❌ List recent docs error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to list recent docs' 
      }
    }
  })

  // Get specific document
  ipcMain.handle('docs-get-doc', async (event, documentId: string) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      console.log('📄 Getting Google Doc...')
      const doc = await docsService.getDoc(documentId)
      
      console.log('✅ Google Doc retrieved successfully')
      return { success: true, doc }
    } catch (error) {
      console.error('❌ Get doc error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get doc' 
      }
    }
  })
}