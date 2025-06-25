// src/services/audio/AudioService.ts - Browser-only version for renderer
// 
// Browser Support for Audio Capture:
// - Chrome/Edge: Full system audio, tab audio, and microphone support
// - Firefox: Tab audio and microphone support (no system audio)
// - Safari: Microphone support only (no system or tab audio)
// - Other browsers: Microphone support only
//
// System Audio Capture Requirements:
// - Chrome 74+ or Edge 79+ (Chromium-based)
// - HTTPS or localhost environment
// - User must grant screen sharing permission
// - User must check "Share audio" when selecting screen
// - Audio must be playing in the system for capture to work

export interface TranscriptionResult {
    text: string
    confidence: number
    timestamp: Date
    duration: number
    source: 'system' | 'screen' | 'tab' | 'microphone'
  }
  
  export interface AudioNote {
    id: string
    title: string
    content: string
    timestamp: Date
    audioData?: Blob
    transcriptions: TranscriptionResult[]
    source: 'system' | 'screen' | 'tab' | 'microphone'
  }
  
  export interface BrowserSupport {
    systemAudio: boolean
    tabAudio: boolean
    microphone: boolean
    screenShare: boolean
    recommendedBrowser: string
    limitations: string[]
  }
  
  export class AudioService {
    private static instance: AudioService
    private mediaRecorder: MediaRecorder | null = null
    private audioChunks: Blob[] = []
    private audioContext: AudioContext | null = null
    private isListening = false
    private onTranscriptionCallback?: (result: TranscriptionResult) => void
    private currentSession: AudioNote | null = null
    private stream: MediaStream | null = null
    private openaiApiKey: string = ''
  
    private constructor() {
      // Get OpenAI API key from environment (works in both Node and Vite-injected renderer)
      this.openaiApiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENAI_API_KEY) || 
                          (typeof process !== 'undefined' && process.env?.VITE_OPENAI_API_KEY) || ''
    }
  
    static getInstance(): AudioService {
      if (!AudioService.instance) {
        AudioService.instance = new AudioService()
      }
      return AudioService.instance
    }
  
    // Enhanced browser support detection
    static getBrowserSupport(): BrowserSupport {
      const userAgent = navigator.userAgent.toLowerCase()
      const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg')
      const isEdge = userAgent.includes('edg')
      const isFirefox = userAgent.includes('firefox')
      const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome')
      
      const limitations: string[] = []
      let recommendedBrowser = 'Chrome or Edge'
  
      // Check basic API support
      const hasGetDisplayMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  
      // System audio support varies by browser
      let systemAudio = false
      let tabAudio = false
      let screenShare = false
  
      if (hasGetDisplayMedia) {
        screenShare = true
        
        // Chrome/Edge have the best system audio support
        if (isChrome || isEdge) {
          systemAudio = true
          tabAudio = true
        } else if (isFirefox) {
          // Firefox has limited system audio support
          systemAudio = false
          tabAudio = true
          limitations.push('Firefox: System audio capture not supported, only tab audio available')
        } else if (isSafari) {
          // Safari has very limited support
          systemAudio = false
          tabAudio = false
          limitations.push('Safari: System and tab audio capture not supported')
        } else {
          // Other browsers
          systemAudio = false
          tabAudio = false
          limitations.push('Browser: System and tab audio capture may not be supported')
        }
      } else {
        limitations.push('Screen sharing API not supported')
      }
  
      // Microphone is widely supported
      const microphone = hasGetUserMedia
  
      if (!systemAudio && !tabAudio) {
        recommendedBrowser = 'Chrome or Edge for system audio capture'
      }
  
      return {
        systemAudio,
        tabAudio,
        microphone,
        screenShare,
        recommendedBrowser,
        limitations
      }
    }
  
    // Capture system audio using getDisplayMedia with audio
    async startSystemAudioCapture(onTranscription?: (result: TranscriptionResult) => void): Promise<void> {
      if (this.isListening) {
        console.warn('Already listening to system audio')
        return
      }
  
      this.onTranscriptionCallback = onTranscription
  
      try {
        console.log('🔊 Starting system audio capture...')
  
        // Check browser support first
        const support = AudioService.getBrowserSupport()
        if (!support.systemAudio) {
          throw new Error(`System audio capture not supported in this browser. ${support.recommendedBrowser}. ${support.limitations.join(' ')}`)
        }
  
        // Request screen share with audio
        this.stream = await navigator.mediaDevices.getDisplayMedia({
          video: false, // We only want audio
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            suppressLocalAudioPlayback: false
          } as any
        })
  
        if (!this.stream.getAudioTracks().length) {
          throw new Error('No audio track available. Make sure to check "Share audio" when selecting screen.')
        }
  
        console.log('✅ System audio stream acquired')
  
        // Set up audio recording
        this.mediaRecorder = new MediaRecorder(this.stream, {
          mimeType: 'audio/webm;codecs=opus'
        })
        
        this.audioChunks = []
        this.isListening = true
  
        // Collect audio data
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data)
          }
        }
  
        // Process audio when stopped
        this.mediaRecorder.onstop = async () => {
          if (this.audioChunks.length > 0) {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
            await this.transcribeAudioBlob(audioBlob)
          }
        }
  
        // Start recording in chunks for real-time processing
        this.mediaRecorder.start(5000) // 5-second chunks
        
        // Set up real-time audio processing for live transcription
        this.setupRealTimeProcessing()
  
        console.log('🎤 System audio capture started successfully')
  
      } catch (error) {
        console.error('❌ Error starting system audio capture:', error)
        this.isListening = false
        
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            throw new Error('Screen sharing permission denied. Please allow screen sharing and ensure "Share audio" is checked.')
          } else if (error.name === 'NotSupportedError') {
            throw new Error('System audio capture not supported in this browser. Try Chrome or Edge.')
          } else if (error.message.includes('System audio capture not supported')) {
            throw error // Re-throw our custom error
          }
        }
        
        throw new Error(`Failed to start system audio capture: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  
    // Set up real-time audio processing for live transcription
    private setupRealTimeProcessing(): void {
      if (!this.stream) return
  
      try {
        this.audioContext = new AudioContext()
        const source = this.audioContext.createMediaStreamSource(this.stream)
        
        // Create a script processor for real-time analysis
        const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
        
        processor.onaudioprocess = (event) => {
          // Here you could implement real-time audio analysis
          // For now, we'll rely on periodic chunk processing
        }
        
        source.connect(processor)
        processor.connect(this.audioContext.destination)
  
      } catch (error) {
        console.warn('Real-time processing setup failed:', error)
      }
    }
  
    // Alternative: Capture browser tab audio specifically  
    async startTabAudioCapture(onTranscription?: (result: TranscriptionResult) => void): Promise<void> {
      if (this.isListening) {
        console.warn('Already listening to audio')
        return
      }
  
      this.onTranscriptionCallback = onTranscription
  
      try {
        console.log('🖥️ Starting tab audio capture...')
  
        // Check browser support first
        const support = AudioService.getBrowserSupport()
        if (!support.tabAudio) {
          throw new Error(`Tab audio capture not supported in this browser. ${support.recommendedBrowser}. ${support.limitations.join(' ')}`)
        }
  
        // Request current tab capture with audio
        this.stream = await navigator.mediaDevices.getDisplayMedia({
          video: true, // Need video to get current tab
          audio: true
        })
  
        // Filter to only audio tracks
        const audioTracks = this.stream.getAudioTracks()
        if (!audioTracks.length) {
          throw new Error('No audio available. Make sure the tab/application is playing audio and "Share audio" is enabled.')
        }
  
        // Create audio-only stream
        const audioStream = new MediaStream(audioTracks)
        
        this.setupRecording(audioStream, 'tab')
        
      } catch (error) {
        console.error('❌ Error starting tab audio capture:', error)
        throw error
      }
    }
  
    // Fallback: Capture microphone audio
    async startMicrophoneCapture(onTranscription?: (result: TranscriptionResult) => void): Promise<void> {
      if (this.isListening) {
        console.warn('Already listening to microphone')
        return
      }
  
      this.onTranscriptionCallback = onTranscription
  
      try {
        console.log('🎤 Starting microphone capture...')
  
        // Check browser support first
        const support = AudioService.getBrowserSupport()
        if (!support.microphone) {
          throw new Error('Microphone access not supported in this browser.')
        }
  
        // Request microphone access
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
  
        console.log('✅ Microphone stream acquired')
        
        this.setupRecording(this.stream, 'microphone')
        
      } catch (error) {
        console.error('❌ Error starting microphone capture:', error)
        this.isListening = false
        
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            throw new Error('Microphone permission denied. Please allow microphone access.')
          } else if (error.name === 'NotFoundError') {
            throw new Error('No microphone found. Please connect a microphone and try again.')
          }
        }
        
        throw new Error(`Failed to start microphone capture: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  
    private setupRecording(stream: MediaStream, source: 'system' | 'screen' | 'tab' | 'microphone'): void {
      this.mediaRecorder = new MediaRecorder(stream)
      this.audioChunks = []
      this.isListening = true
  
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }
  
      // Process chunks as they come in for near real-time transcription
      this.mediaRecorder.onstop = async () => {
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
          await this.transcribeAudioBlob(audioBlob, source)
        }
      }
  
      // Start recording in 10-second chunks for processing
      this.mediaRecorder.start(10000)
      
      // Set up periodic chunk processing for live transcription
      this.startPeriodicTranscription(source)
    }
  
    private startPeriodicTranscription(source: 'system' | 'screen' | 'tab' | 'microphone'): void {
      const processChunks = async () => {
        if (!this.isListening || this.audioChunks.length === 0) return
  
        try {
          // Take the latest chunk for transcription
          const latestChunk = this.audioChunks[this.audioChunks.length - 1]
          if (latestChunk.size > 0) {
            await this.transcribeAudioBlob(latestChunk, source)
          }
        } catch (error) {
          console.warn('Error processing audio chunk:', error)
        }
      }
  
      // Process chunks every 10 seconds
      const interval = setInterval(() => {
        if (!this.isListening) {
          clearInterval(interval)
          return
        }
        processChunks()
      }, 10000)
  
      // Clean up interval when recording stops
      this.mediaRecorder?.addEventListener('stop', () => {
        clearInterval(interval)
      })
    }
  
    // Transcribe audio blob using OpenAI Whisper API
    private async transcribeAudioBlob(audioBlob: Blob, source: 'system' | 'screen' | 'tab' | 'microphone' = 'system'): Promise<void> {
      if (!this.openaiApiKey) {
        console.warn('No OpenAI API key available for transcription')
        return
      }
  
      try {
        // Convert blob to base64
        const arrayBuffer = await audioBlob.arrayBuffer()
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  
        // Call OpenAI Whisper API
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file: `data:audio/webm;base64,${base64Audio}`,
            model: 'whisper-1',
            response_format: 'verbose_json',
            timestamp_granularities: ['word']
          })
        })
  
        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
        }
  
        const result = await response.json()
        
        if (result.text && result.text.trim()) {
          const transcription: TranscriptionResult = {
            text: result.text.trim(),
            confidence: result.duration ? 0.9 : 0.7, // Estimate confidence
            timestamp: new Date(),
            duration: result.duration || 0,
            source
          }
  
          console.log('📝 Transcription result:', transcription.text)
  
          if (this.onTranscriptionCallback) {
            this.onTranscriptionCallback(transcription)
          }
  
          // Add to current session if exists
          if (this.currentSession) {
            this.currentSession.transcriptions.push(transcription)
            this.currentSession.content = this.currentSession.transcriptions
              .map(t => t.text)
              .join(' ')
          }
        }
  
      } catch (error) {
        console.error('❌ Transcription error:', error)
        // Don't throw - allow recording to continue even if transcription fails
      }
    }
  
    stopListening(): Blob | null {
      if (!this.isListening || !this.mediaRecorder) return null
  
      this.mediaRecorder.stop()
      this.isListening = false
  
      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop())
        this.stream = null
      }
  
      // Close audio context
      if (this.audioContext) {
        this.audioContext.close()
        this.audioContext = null
      }
  
      if (this.audioChunks.length > 0) {
        return new Blob(this.audioChunks, { type: 'audio/webm' })
      }
  
      return null
    }
  
    startNewSession(title?: string, source: 'system' | 'screen' | 'tab' | 'microphone' = 'system'): AudioNote {
      this.currentSession = {
        id: crypto.randomUUID(),
        title: title || `Audio Session ${new Date().toLocaleString()}`,
        content: '',
        timestamp: new Date(),
        transcriptions: [],
        source
      }
      return this.currentSession
    }
  
    getCurrentSession(): AudioNote | null {
      return this.currentSession
    }
  
    endCurrentSession(): AudioNote | null {
      const session = this.currentSession
      this.currentSession = null
      return session
    }
  
    isCurrentlyListening(): boolean {
      return this.isListening
    }
  }