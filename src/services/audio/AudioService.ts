/**
 * Audio Service
 * 
 * Handles audio capture, transcription, and processing for interview assistance.
 * Provides functionality for recording system audio, transcribing speech to text,
 * and generating AI-powered responses for interview preparation.
 */

import { desktopCapturer, BrowserWindow } from 'electron'
import type { AudioCaptureOptions, AudioCaptureResult } from '../../types'

export class AudioService {
  private static instance: AudioService
  private isCapturing: boolean = false
  private mainWindow: BrowserWindow | null = null

  private constructor() {}

  /**
   * Get the singleton instance of AudioService
   * @returns AudioService - The singleton instance
   */
  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService()
    }
    return AudioService.instance
  }

  /**
   * Set the main window reference for audio capture coordination
   * @param window - The main Electron browser window
   */
  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * Start audio capture from system sources
   * @param options - Audio capture configuration options
   * @returns Promise<AudioCaptureResult> - Result indicating success or failure with error details
   */
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
      
      console.log('[✓] Audio capture setup completed')
      return { success: true }

    } catch (error) {
      this.isCapturing = false
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start audio capture'
      }
    }
  }

  /**
   * Stop the current audio capture session
   * @returns Promise<AudioCaptureResult> - Result indicating success or failure
   */
  async stopAudioCapture(): Promise<AudioCaptureResult> {
    if (!this.isCapturing) {
      return { success: false, error: 'No audio capture in progress' }
    }

    try {
      console.log('Stopping audio capture...')
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

  /**
   * Check if audio capture is currently active
   * @returns boolean - True if audio capture is in progress
   */
  isCapturingAudio(): boolean {
    return this.isCapturing
  }

  /**
   * Transcribe audio data to text using OpenAI Whisper API
   * @param audioData - Raw audio data as ArrayBuffer
   * @returns Promise<{ success: boolean; text?: string; error?: string }> - Transcription result with text or error
   */
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
      console.error('Transcription error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed'
      }
    }
  }

  /**
   * Process audio for interview assistance with AI-powered feedback
   * @param audioData - Raw audio data as ArrayBuffer
   * @returns Promise<{ success: boolean; response?: string; error?: string }> - AI response or error
   */
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

      console.log('[✓] Transcription:', transcription.text)

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
      
      console.log('AI Response:', aiResponse)
      
      return {
        success: true,
        response: aiResponse
      }

    } catch (error) {
      console.error('Audio processing error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process audio'
      }
    }
  }

  /**
   * Analyze base64-encoded audio data for interview assistance
   * @param data - Base64-encoded audio data
   * @param mimeType - MIME type of the audio data
   * @returns Promise<{ text: string; timestamp: number }> - AI response with timestamp
   * @throws {Error} If audio processing fails
   */
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
      console.error('Audio analysis error:', error)
      throw error
    }
  }

  /**
   * Transcribe base64-encoded audio data to text
   * @param data - Base64-encoded audio data
   * @param mimeType - MIME type of the audio data
   * @returns Promise<{ text: string; timestamp: number }> - Transcribed text with timestamp
   * @throws {Error} If transcription fails
   */
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
      console.error('Audio transcription error:', error)
      throw error
    }
  }
} 