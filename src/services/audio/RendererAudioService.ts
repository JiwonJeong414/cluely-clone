import type { AudioCaptureOptions, AudioCaptureResult } from '../../types'

export class RendererAudioService {
  private static instance: RendererAudioService
  private isCapturing: boolean = false
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private capturePromise: Promise<AudioCaptureResult> | null = null
  private stopTimeout: NodeJS.Timeout | null = null
  
  // Web Audio API fallback
  private audioContext: AudioContext | null = null
  private audioSource: MediaStreamAudioSourceNode | null = null
  private audioProcessor: ScriptProcessorNode | null = null
  private audioBuffer: Float32Array[] = []
  private sampleRate: number = 44100

  private constructor() {}

  static getInstance(): RendererAudioService {
    if (!RendererAudioService.instance) {
      RendererAudioService.instance = new RendererAudioService()
    }
    return RendererAudioService.instance
  }

  async startAudioCapture(options: AudioCaptureOptions = {}): Promise<AudioCaptureResult> {
    if (this.isCapturing) {
      console.log('⚠️ Already capturing, returning early')
      return { success: false, error: 'Audio capture already in progress' }
    }

    try {
      console.log('🎤 Starting audio capture...')
      this.isCapturing = true
      this.audioChunks = []
      this.audioBuffer = []

      // Get system audio sources using desktopCapturer
      const sources = await (window as any).electronAPI?.getAvailableScreens?.() || []
      console.log('📺 Available sources:', sources.length)
      
      if (sources.length === 0) {
        throw new Error('No screen sources found for audio capture')
      }

      // Get the first available screen source (which includes audio)
      const screenSource = sources[0]
      console.log('🎯 Using source:', screenSource.name)

      // Request screen capture with audio
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screenSource.id
          }
        } as any,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: screenSource.id
          }
        } as any
      })

      // Debug: log tracks
      console.log('Stream tracks:', this.stream.getTracks().map(t => t.kind))
      const audioTracks = this.stream.getAudioTracks()
      console.log('Audio tracks:', audioTracks)

      if (audioTracks.length === 0) {
        this.cleanup()
        return { success: false, error: 'No audio track found in the stream. System audio may not be available.' }
      }

      // Try MediaRecorder first
      let mediaRecorderSuccess = false
      try {
        mediaRecorderSuccess = await this.tryMediaRecorder()
      } catch (error) {
        console.log('❌ MediaRecorder failed, trying Web Audio API fallback...')
      }

      // If MediaRecorder fails, use Web Audio API
      if (!mediaRecorderSuccess) {
        console.log('🔄 Using Web Audio API fallback...')
        return await this.startWebAudioCapture(options)
      }

      return this.capturePromise!

    } catch (error) {
      console.error('❌ Error starting audio capture:', error)
      this.cleanup()
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start audio capture'
      }
    }
  }

  private async tryMediaRecorder(): Promise<boolean> {
    // Fallback for MediaRecorder mime type
    let mimeType = 'audio/webm;codecs=opus'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ''
      }
    }
    console.log('Using MediaRecorder mimeType:', mimeType)

    try {
      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.stream!, { mimeType })
        : new MediaRecorder(this.stream!)
    } catch (err) {
      console.error('❌ Failed to create MediaRecorder:', err)
      return false
    }

    this.capturePromise = new Promise((resolve, reject) => {
      this.mediaRecorder!.onstart = () => {
        console.log('🎤 MediaRecorder started successfully')
      }

      this.mediaRecorder!.ondataavailable = (event) => {
        console.log('📦 Data available:', event.data.size, 'bytes')
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder!.onstop = async () => {
        console.log('🛑 MediaRecorder stopped, processing data...')
        try {
          if (this.audioChunks.length === 0) {
            throw new Error('No audio data captured')
          }

          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
          console.log('🎵 Audio blob size:', audioBlob.size, 'bytes')
          
          const arrayBuffer = await audioBlob.arrayBuffer()
          console.log('📊 ArrayBuffer size:', arrayBuffer.byteLength, 'bytes')
          
          this.cleanup()
          
          resolve({
            success: true,
            audioData: arrayBuffer,
            duration: audioBlob.size / 16000 // Rough estimate
          })
        } catch (error) {
          console.error('❌ Error processing audio data:', error)
          this.cleanup()
          reject({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }

      this.mediaRecorder!.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event)
        this.cleanup()
        reject({ success: false, error: 'MediaRecorder error' })
      }

      // Start recording with a small timeslice to get data more frequently
      console.log('▶️ Starting MediaRecorder...')
      try {
        this.mediaRecorder!.start(1000) // Get data every second
        return true
      } catch (startError) {
        console.error('❌ Failed to start MediaRecorder:', startError)
        return false
      }
    })

    return true
  }

  private async startWebAudioCapture(options: AudioCaptureOptions): Promise<AudioCaptureResult> {
    try {
      // Create AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.sampleRate = this.audioContext.sampleRate
      console.log('🎵 AudioContext created, sample rate:', this.sampleRate)

      // Create audio source from stream
      this.audioSource = this.audioContext.createMediaStreamSource(this.stream!)
      
      // Create script processor for audio processing
      this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1)
      
      this.audioProcessor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer
        const inputData = inputBuffer.getChannelData(0)
        
        // Copy audio data to our buffer
        const copy = new Float32Array(inputData.length)
        copy.set(inputData)
        this.audioBuffer.push(copy)
        
        console.log('📊 Audio data captured:', inputData.length, 'samples')
      }

      // Connect the audio nodes
      this.audioSource.connect(this.audioProcessor)
      this.audioProcessor.connect(this.audioContext.destination)

      console.log('✅ Web Audio API capture started')

      // Set duration limit if specified
      if (options.duration) {
        console.log(`⏰ Setting duration limit: ${options.duration} seconds`)
        this.stopTimeout = setTimeout(() => {
          if (this.isCapturing) {
            console.log('⏰ Duration limit reached, stopping...')
            this.stopWebAudioCapture()
          }
        }, options.duration * 1000)
      }

      return { success: true }

    } catch (error) {
      console.error('❌ Web Audio API capture failed:', error)
      this.cleanup()
      return {
        success: false,
        error: 'Web Audio API capture failed: ' + (error instanceof Error ? error.message : String(error))
      }
    }
  }

  private stopWebAudioCapture(): AudioCaptureResult {
    try {
      console.log('🛑 Stopping Web Audio API capture...')
      
      // Disconnect audio nodes
      if (this.audioProcessor) {
        this.audioProcessor.disconnect()
        this.audioProcessor = null
      }
      
      if (this.audioSource) {
        this.audioSource.disconnect()
        this.audioSource = null
      }
      
      if (this.audioContext) {
        this.audioContext.close()
        this.audioContext = null
      }

      // Convert audio buffer to WAV format
      if (this.audioBuffer.length > 0) {
        const wavData = this.convertToWAV(this.audioBuffer)
        console.log('🎵 WAV data created, size:', wavData.byteLength, 'bytes')
        
        this.cleanup()
        
        return {
          success: true,
          audioData: wavData,
          duration: this.audioBuffer.length * 4096 / this.sampleRate
        }
      } else {
        this.cleanup()
        return { success: false, error: 'No audio data captured' }
      }

    } catch (error) {
      console.error('❌ Error stopping Web Audio capture:', error)
      this.cleanup()
      return {
        success: false,
        error: 'Failed to stop Web Audio capture: ' + (error instanceof Error ? error.message : String(error))
      }
    }
  }

  private convertToWAV(audioBuffer: Float32Array[]): ArrayBuffer {
    // Calculate total length
    const totalLength = audioBuffer.reduce((sum, buffer) => sum + buffer.length, 0)
    
    // Create WAV header
    const wavHeader = new ArrayBuffer(44)
    const view = new DataView(wavHeader)
    
    // WAV file header
    view.setUint32(0, 0x52494646, false) // "RIFF"
    view.setUint32(4, 36 + totalLength * 2, true) // File size
    view.setUint32(8, 0x57415645, false) // "WAVE"
    view.setUint32(12, 0x666D7420, false) // "fmt "
    view.setUint32(16, 16, true) // Chunk size
    view.setUint16(20, 1, true) // Audio format (PCM)
    view.setUint16(22, 1, true) // Channels
    view.setUint32(24, this.sampleRate, true) // Sample rate
    view.setUint32(28, this.sampleRate * 2, true) // Byte rate
    view.setUint16(32, 2, true) // Block align
    view.setUint16(34, 16, true) // Bits per sample
    view.setUint32(36, 0x64617461, false) // "data"
    view.setUint32(40, totalLength * 2, true) // Data size
    
    // Combine header and audio data
    const wavData = new ArrayBuffer(44 + totalLength * 2)
    const wavView = new Uint8Array(wavData)
    const headerView = new Uint8Array(wavHeader)
    
    // Copy header
    wavView.set(headerView, 0)
    
    // Copy and convert audio data
    const dataView = new DataView(wavData)
    let offset = 44
    for (const buffer of audioBuffer) {
      for (let i = 0; i < buffer.length; i++) {
        const sample = Math.max(-1, Math.min(1, buffer[i]))
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
        dataView.setInt16(offset, intSample, true)
        offset += 2
      }
    }
    
    return wavData
  }

  async stopAudioCapture(): Promise<AudioCaptureResult> {
    if (!this.isCapturing) {
      console.log('⚠️ Not capturing, returning early')
      return { success: false, error: 'No audio capture in progress' }
    }

    try {
      console.log('🛑 Stopping audio capture...')
      
      // Clear timeout
      if (this.stopTimeout) {
        clearTimeout(this.stopTimeout)
        this.stopTimeout = null
      }
      
      // Stop based on capture method
      if (this.mediaRecorder && this.capturePromise) {
        this.mediaRecorder.stop()
        return await this.capturePromise
      } else if (this.audioContext) {
        return this.stopWebAudioCapture()
      } else {
        this.cleanup()
        return { success: false, error: 'No active capture method found' }
      }
    } catch (error) {
      console.error('❌ Error stopping audio capture:', error)
      this.cleanup()
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop audio capture'
      }
    }
  }

  isCapturingAudio(): boolean {
    return this.isCapturing
  }

  private cleanup() {
    console.log('🧹 Cleaning up audio service...')
    this.isCapturing = false
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        console.log('🛑 Stopping track during cleanup:', track.kind)
        track.stop()
      })
      this.stream = null
    }
    
    this.mediaRecorder = null
    this.capturePromise = null
    
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout)
      this.stopTimeout = null
    }
    
    // Clean up Web Audio API
    if (this.audioProcessor) {
      this.audioProcessor.disconnect()
      this.audioProcessor = null
    }
    
    if (this.audioSource) {
      this.audioSource.disconnect()
      this.audioSource = null
    }
    
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    
    this.audioBuffer = []
  }

  // Force cleanup method for emergency situations
  forceCleanup() {
    console.log('🚨 Force cleaning up audio service...')
    this.cleanup()
  }
} 