import { ipcMain } from 'electron'
import { AudioService } from '../../src/services/audio/AudioService'

export function setupAudioHandlers(audioService: AudioService) {
  // Start audio capture
  ipcMain.handle('audio-start-capture', async (event, options = {}) => {
    try {
      console.log('🎤 Starting audio capture...')
      const result = await audioService.startAudioCapture(options)
      
      if (result.success) {
        console.log('[✓] Audio capture started successfully')
      } else {
        console.error('Failed to start audio capture:', result.error)
      }
      
      return result
    } catch (error) {
      console.error('Audio start capture error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start audio capture' 
      }
    }
  })

  // Stop audio capture
  ipcMain.handle('audio-stop-capture', async () => {
    try {
      console.log('Stopping audio capture...')
      const result = await audioService.stopAudioCapture()
      
      if (result.success) {
        console.log('[✓] Audio capture stopped successfully')
      } else {
        console.error('Failed to stop audio capture:', result.error)
      }
      
      return result
    } catch (error) {
      console.error('Audio stop capture error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to stop audio capture' 
      }
    }
  })

  // Process audio for interview
  ipcMain.handle('audio-process-for-interview', async (event, audioData: ArrayBuffer) => {
    try {
      console.log('Processing audio for interview assistance...')
      const result = await audioService.processAudioForInterview(audioData)
      
      if (result.success) {
        console.log('[✓] Audio processed successfully for interview')
      } else {
        console.error('Failed to process audio:', result.error)
      }
      
      return result
    } catch (error) {
      console.error('Audio process error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process audio' 
      }
    }
  })

  // Check if capturing
  ipcMain.handle('audio-is-capturing', () => {
    return audioService.isCapturingAudio()
  })

  // Analyze audio from base64
  ipcMain.handle('analyze-audio-base64', async (event, data: string, mimeType: string) => {
    try {
      console.log('Analyzing audio with OpenAI...')
      const result = await audioService.analyzeAudioFromBase64(data, mimeType)
      
      console.log('[✓] Audio analysis completed successfully')
      return result
    } catch (error) {
      console.error('Audio analysis error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze audio' 
      }
    }
  })

  // Transcribe audio from base64
  ipcMain.handle('transcribe-audio-base64', async (event, data: string, mimeType: string) => {
    try {
      console.log('Transcribing audio with OpenAI...')
      const result = await audioService.transcribeAudioFromBase64(data, mimeType)
      
      console.log('[✓] Audio transcription completed successfully')
      return result
    } catch (error) {
      console.error('Audio transcription error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to transcribe audio' 
      }
    }
  })

  // Analyze audio file
  ipcMain.handle('analyze-audio-file', async (event, path: string) => {
    try {
      console.log('🎵 Analyzing audio file with OpenAI...')
      
      const fs = require('fs')
      const audioData = await fs.promises.readFile(path)
      const base64Data = audioData.toString('base64')
      
      const result = await audioService.analyzeAudioFromBase64(base64Data, 'audio/mp3')
      
      console.log('[✓] Audio file analysis completed successfully')
      return result
    } catch (error) {
      console.error('Audio file analysis error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze audio file' 
      }
    }
  })
}