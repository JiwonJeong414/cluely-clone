import { desktopCapturer, BrowserWindow } from 'electron'

export interface AudioCaptureOptions {
  duration?: number // in seconds
  sampleRate?: number
  channels?: number
}

export interface AudioCaptureResult {
  success: boolean
  audioData?: ArrayBuffer
  error?: string
  duration?: number
}

export class AudioService {
  private static instance: AudioService
  private isCapturing: boolean = false
  private mainWindow: BrowserWindow | null = null

  private constructor() {}

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService()
    }
    return AudioService.instance
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  async startAudioCapture(options: AudioCaptureOptions = {}): Promise<AudioCaptureResult> {
    if (this.isCapturing) {
      return { success: false, error: 'Audio capture already in progress' }
    }

    try {
      this.isCapturing = true
      console.log('🎤 Starting audio capture in main process...')

      // Get system audio sources
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 0, height: 0 }
      })

      if (sources.length === 0) {
        throw new Error('No screen sources found for audio capture')
      }

      // For now, we'll use a simplified approach
      // The actual audio capture will be handled in the renderer process
      // This service will coordinate the process
      
      console.log('✅ Audio capture setup completed')
      return { success: true }

    } catch (error) {
      this.isCapturing = false
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start audio capture'
      }
    }
  }

  async stopAudioCapture(): Promise<AudioCaptureResult> {
    if (!this.isCapturing) {
      return { success: false, error: 'No audio capture in progress' }
    }

    try {
      console.log('🛑 Stopping audio capture...')
      this.isCapturing = false
      return { success: true }
    } catch (error) {
      this.isCapturing = false
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop audio capture'
      }
    }
  }

  isCapturingAudio(): boolean {
    return this.isCapturing
  }

  async transcribeAudio(audioData: ArrayBuffer): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key not found')
      }

      // Send to OpenAI Whisper API for transcription
      const formData = new FormData()
      const blob = new Blob([audioData], { type: 'audio/webm' })
      formData.append('file', blob, 'audio.webm')
      formData.append('model', 'whisper-1')

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Transcription failed: ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      return {
        success: true,
        text: result.text
      }

    } catch (error) {
      console.error('❌ Transcription error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed'
      }
    }
  }

  async processAudioForInterview(audioData: ArrayBuffer): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key not found')
      }

      // First transcribe the audio
      const transcription = await this.transcribeAudio(audioData)
      
      if (!transcription.success || !transcription.text) {
        return { success: false, error: 'Failed to transcribe audio' }
      }

      console.log('📝 Transcription:', transcription.text)

      // Send to OpenAI for interview assistance
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant helping with interview preparation. 
              Listen to the transcribed audio and provide helpful responses, suggestions, or answers to interview questions.
              Be concise, professional, and supportive. Focus on helping the user improve their interview performance.
              If the audio contains a question, provide a thoughtful answer. If it contains a statement or request for feedback, provide constructive feedback.`
            },
            {
              role: 'user',
              content: `Here's the transcribed audio from an interview: "${transcription.text}"
              
              Please provide helpful feedback, suggestions, or answers based on this content.`
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`)
      }

      const result = await response.json()
      const aiResponse = result.choices[0]?.message?.content || 'No response generated'
      
      console.log('🤖 AI Response:', aiResponse)
      
      return {
        success: true,
        response: aiResponse
      }

    } catch (error) {
      console.error('❌ Audio processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process audio'
      }
    }
  }

  async analyzeAudioFromBase64(data: string, mimeType: string): Promise<{ text: string; timestamp: number }> {
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key not found')
      }

      // Convert base64 to ArrayBuffer
      const binaryString = atob(data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const audioData = bytes.buffer

      // Process the audio
      const result = await this.processAudioForInterview(audioData)
      
      if (!result.success || !result.response) {
        throw new Error(result.error || 'Failed to process audio')
      }

      return {
        text: result.response,
        timestamp: Date.now()
      }

    } catch (error) {
      console.error('❌ Audio analysis error:', error)
      throw error
    }
  }

  async transcribeAudioFromBase64(data: string, mimeType: string): Promise<{ text: string; timestamp: number }> {
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key not found')
      }

      // Convert base64 to ArrayBuffer
      const binaryString = atob(data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const audioData = bytes.buffer

      // Only transcribe the audio, don't send to OpenAI for analysis
      const result = await this.transcribeAudio(audioData)
      
      if (!result.success || !result.text) {
        throw new Error(result.error || 'Failed to transcribe audio')
      }

      return {
        text: result.text,
        timestamp: Date.now()
      }

    } catch (error) {
      console.error('❌ Audio transcription error:', error)
      throw error
    }
  }
} 