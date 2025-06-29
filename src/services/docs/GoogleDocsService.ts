import { google } from 'googleapis'
import { AuthService } from '../auth/AuthService.js'
import type { User, GoogleDoc, NoteContent } from '../../types'

export class GoogleDocsService {
  private static instance: GoogleDocsService
  private authService: AuthService
  private docs: any

  private constructor() {
    this.authService = AuthService.getInstance()
  }

  static getInstance(): GoogleDocsService {
    if (!GoogleDocsService.instance) {
      GoogleDocsService.instance = new GoogleDocsService()
    }
    return GoogleDocsService.instance
  }

  private initializeDocs() {
    const oauth2Client = this.authService.getOAuthClient()
    this.docs = google.docs({ version: 'v1', auth: oauth2Client })
  }

  /**
   * Create a new Google Doc with the given content
   */
  async createNote(noteContent: NoteContent): Promise<GoogleDoc> {
    if (!this.docs) this.initializeDocs()

    try {
      // Create the document
      const createResponse = await this.docs.documents.create({
        requestBody: {
          title: noteContent.title
        }
      })

      const documentId = createResponse.data.documentId
      console.log(`📝 Created Google Doc: ${documentId}`)

      // Format the content for Google Docs
      const formattedContent = this.formatContentForDocs(noteContent)

      // Write content to the document
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: formattedContent
        }
      })

      // Get the document details using Drive API for webViewLink
      const drive = google.drive({ version: 'v3', auth: this.authService.getOAuthClient() })
      const driveResponse = await drive.files.get({
        fileId: documentId,
        fields: 'id,name,webViewLink,createdTime,modifiedTime'
      })

      console.log(`✅ Note written to Google Docs: ${noteContent.title}`)

      return {
        id: documentId,
        name: driveResponse.data.name || noteContent.title,
        webViewLink: driveResponse.data.webViewLink || '',
        createdTime: driveResponse.data.createdTime || '',
        modifiedTime: driveResponse.data.modifiedTime || ''
      }

    } catch (error) {
      console.error('Error creating Google Doc note:', error)
      throw error
    }
  }

  /**
   * Append content to an existing Google Doc
   */
  async appendToNote(documentId: string, content: string): Promise<void> {
    if (!this.docs) this.initializeDocs()

    try {
      // Get current document to find the end index
      const doc = await this.docs.documents.get({
        documentId,
        fields: 'body'
      })

      const endIndex = doc.data.body.content?.[doc.data.body.content.length - 1]?.endIndex || 1

      // Append content
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: {
                  index: endIndex - 1
                },
                text: '\n\n' + content
              }
            }
          ]
        }
      })

      console.log(`✅ Content appended to Google Doc: ${documentId}`)

    } catch (error) {
      console.error('Error appending to Google Doc:', error)
      throw error
    }
  }

  /**
   * List recent Google Docs
   */
  async listRecentDocs(limit: number = 10): Promise<GoogleDoc[]> {
    if (!this.docs) this.initializeDocs()

    try {
      // Use Drive API to list Google Docs
      const drive = google.drive({ version: 'v3', auth: this.authService.getOAuthClient() })
      
      const response = await drive.files.list({
        pageSize: limit,
        orderBy: 'modifiedTime desc',
        q: "mimeType='application/vnd.google-apps.document' and trashed=false",
        fields: 'files(id,name,webViewLink,createdTime,modifiedTime)'
      })

      return (response.data.files || []).map(file => ({
        id: file.id!,
        name: file.name!,
        webViewLink: file.webViewLink || '',
        createdTime: file.createdTime || '',
        modifiedTime: file.modifiedTime || ''
      }))

    } catch (error) {
      console.error('Error listing Google Docs:', error)
      throw error
    }
  }

  /**
   * Get a specific Google Doc by ID
   */
  async getDoc(documentId: string): Promise<GoogleDoc> {
    if (!this.docs) this.initializeDocs()

    try {
      // Use Drive API to get document metadata
      const drive = google.drive({ version: 'v3', auth: this.authService.getOAuthClient() })
      const response = await drive.files.get({
        fileId: documentId,
        fields: 'id,name,webViewLink,createdTime,modifiedTime'
      })

      return {
        id: response.data.id!,
        name: response.data.name || '',
        webViewLink: response.data.webViewLink || '',
        createdTime: response.data.createdTime || '',
        modifiedTime: response.data.modifiedTime || ''
      }

    } catch (error) {
      console.error('Error getting Google Doc:', error)
      throw error
    }
  }

  /**
   * Format content for Google Docs API
   */
  private formatContentForDocs(noteContent: NoteContent): any[] {
    const requests: any[] = []
    let currentIndex = 1

    // Add title
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: noteContent.title + '\n'
      }
    })

    currentIndex += noteContent.title.length + 1

    // Style the title
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: 1,
          endIndex: currentIndex
        },
        paragraphStyle: {
          namedStyleType: 'TITLE'
        },
        fields: 'namedStyleType'
      }
    })

    // Add timestamp
    const timestampText = `Created: ${noteContent.timestamp.toLocaleString()}\n`
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: timestampText
      }
    })

    currentIndex += timestampText.length

    // Add type indicator
    const typeText = `Type: ${noteContent.type.charAt(0).toUpperCase() + noteContent.type.slice(1)}\n\n`
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: typeText
      }
    })

    currentIndex += typeText.length

    // Add metadata if available
    if (noteContent.metadata) {
      if (noteContent.metadata.transcription) {
        const transcriptionText = `Transcription:\n${noteContent.metadata.transcription}\n\n`
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: transcriptionText
          }
        })
        currentIndex += transcriptionText.length
      }

      if (noteContent.metadata.audioDuration) {
        const durationText = `Audio Duration: ${noteContent.metadata.audioDuration} seconds\n\n`
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: durationText
          }
        })
        currentIndex += durationText.length
      }
    }

    // Add main content
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: noteContent.content
      }
    })

    return requests
  }

  /**
   * Create a note from screenshot analysis
   */
  async createScreenshotNote(
    title: string,
    screenshotUrl: string,
    aiAnalysis: string,
    userQuestion?: string
  ): Promise<GoogleDoc> {
    const noteContent: NoteContent = {
      title: `Screenshot Analysis: ${title}`,
      content: `AI Analysis:\n${aiAnalysis}${userQuestion ? `\n\nUser Question: ${userQuestion}` : ''}`,
      timestamp: new Date(),
      type: 'screenshot',
      metadata: {
        screenshotUrl,
        aiAnalysis
      }
    }

    return this.createNote(noteContent)
  }

  /**
   * Create a note from audio capture
   */
  async createAudioNote(
    title: string,
    transcription: string,
    aiAnalysis: string,
    audioDuration?: number
  ): Promise<GoogleDoc> {
    const noteContent: NoteContent = {
      title: `Audio Capture: ${title}`,
      content: `AI Analysis:\n${aiAnalysis}`,
      timestamp: new Date(),
      type: 'audio',
      metadata: {
        transcription,
        audioDuration,
        aiAnalysis
      }
    }

    return this.createNote(noteContent)
  }

  /**
   * Create a note from conversation
   */
  async createConversationNote(
    title: string,
    conversation: string,
    aiSummary?: string
  ): Promise<GoogleDoc> {
    const noteContent: NoteContent = {
      title: `Conversation: ${title}`,
      content: `Conversation:\n${conversation}${aiSummary ? `\n\nAI Summary:\n${aiSummary}` : ''}`,
      timestamp: new Date(),
      type: 'conversation',
      metadata: {
        aiAnalysis: aiSummary
      }
    }

    return this.createNote(noteContent)
  }
} 