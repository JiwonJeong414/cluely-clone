import React, { useState } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import type { AudioButtonProps } from '../types/components'

/** Records audio input and transcribes it to text for voice-based interactions. */
export const AudioButton: React.FC<AudioButtonProps> = ({ onAudioProcessed, className = '' }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [status, setStatus] = useState<string>('')

  const handleStartRecording = async () => {
    try {
      setStatus('Starting recording...')
      setIsRecording(true)

      // Asks the user for mic access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })

      // Set up a recorder usingthe mic stream
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      })

      const chunks: Blob[] = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = async () => {
        try {
          setStatus('')
          setIsProcessing(true)
          
          const audioBlob = new Blob(chunks, { type: 'audio/webm' })
          const reader = new FileReader()
          
          reader.onloadend = async () => {
            try {
              const base64Data = (reader.result as string).split(',')[1]
              
              // Only transcribe the audio, don't send to OpenAI for analysis
              const result = await window.electronAPI.audio.transcribeFromBase64(
                base64Data, 
                'audio/webm' 
              )
              
              if (result && 'text' in result) {
                setStatus('')
                onAudioProcessed?.(result.text)
                console.log('[✓] Audio transcribed successfully:', result.text)
              } else if (result && 'success' in result && !result.success) {
                setStatus('Transcription failed')
                console.error('Audio transcription failed:', result.error)
              } else {
                setStatus('Transcription failed')
                console.error('Audio transcription failed:', result)
              }
            } catch (error) {
              console.error('Audio transcription error:', error)
              setStatus('Transcription failed')
            } finally {
              setIsProcessing(false)
              setTimeout(() => setStatus(''), 3000)
            }
          }
          
          reader.readAsDataURL(audioBlob)
          
        } catch (error) {
          console.error('Error processing audio:', error)
          setStatus('Processing failed')
          setIsProcessing(false)
          setTimeout(() => setStatus(''), 3000)
        }
      }

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setStatus('Recording error')
        setIsRecording(false)
        setTimeout(() => setStatus(''), 3000)
      }

      setMediaRecorder(recorder)
      recorder.start(1000) // Get data every second
      setStatus('')
      
    } catch (error) {
      console.error('Error starting recording:', error)
      setStatus('Failed to start recording')
      setIsRecording(false)
      setTimeout(() => setStatus(''), 3000)
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const handleClick = () => {
    if (isProcessing) {
      return // Don't allow clicks while processing
    }

    if (isRecording) {
      handleStopRecording()
    } else {
      handleStartRecording()
    }
  }

  const getButtonContent = () => {
    if (isProcessing) {
      return <Loader2 className="w-4 h-4 animate-spin" />
    }
    
    if (isRecording) {
      return <MicOff className="w-4 h-4" />
    }
    
    return <Mic className="w-4 h-4" />
  }

  const getButtonTitle = () => {
    if (status) {
      return status
    }
    
    if (isProcessing) {
      return 'Processing audio...'
    }
    
    if (isRecording) {
      return 'Stop recording'
    }
    
    return 'Start audio recording'
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isProcessing}
        title={getButtonTitle()}
        className={`
          relative p-2 rounded-full transition-all duration-200 ease-in-out
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
          ${className}
        `}
      >
        {getButtonContent()}
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>
      
      {/* Status display */}
      {status && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 font-mono whitespace-nowrap">
          {status}
        </div>
      )}
    </div>
  )
} 