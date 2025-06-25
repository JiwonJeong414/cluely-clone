// src/components/AudioNotes.tsx - System Audio Version
import React, { useState, useEffect, useRef } from 'react'
import { AudioService, type TranscriptionResult, type AudioNote, type BrowserSupport } from '../services/audio/AudioService'
import { DocsService, type GoogleDoc } from '../services/docs/DocsService'

interface AudioNotesProps {
  user: any
  googleConnection: any
  className?: string
}

export const AudioNotes: React.FC<AudioNotesProps> = ({
  user,
  googleConnection,
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false)
  const [browserSupport, setBrowserSupport] = useState<BrowserSupport | null>(null)
  const [currentSession, setCurrentSession] = useState<AudioNote | null>(null)
  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([])
  const [recentDocs, setRecentDocs] = useState<GoogleDoc[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [sessionTitle, setSessionTitle] = useState('')
  const [captureMode, setCaptureMode] = useState<'system' | 'tab' | 'microphone'>('system')
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false)
  
  const audioService = useRef(AudioService.getInstance())
  const docsService = useRef(DocsService.getInstance())
  const transcriptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check browser support
    const support = AudioService.getBrowserSupport()
    setBrowserSupport(support)
    
    // Set default capture mode based on support
    if (support.systemAudio) {
      setCaptureMode('system')
    } else if (support.tabAudio) {
      setCaptureMode('tab')
    } else if (support.microphone) {
      setCaptureMode('microphone')
    }
    
    // Check if OpenAI API key is available
    setHasOpenAIKey(!!import.meta.env.VITE_OPENAI_API_KEY)
    
    // Load recent docs if connected
    if (user && googleConnection.isConnected) {
      loadRecentDocs()
    }
  }, [user, googleConnection.isConnected])

  const loadRecentDocs = async () => {
    try {
      const docs = await docsService.current.listRecentDocs(5)
      setRecentDocs(docs)
    } catch (error) {
      console.error('Error loading recent docs:', error)
    }
  }

  const handleStartListening = async () => {
    if (!browserSupport || !user || !googleConnection.isConnected) return

    try {
      // Start new session
      const title = sessionTitle.trim() || `${captureMode === 'system' ? 'System' : captureMode === 'tab' ? 'Tab' : 'Microphone'} Audio ${new Date().toLocaleTimeString()}`
      const session = audioService.current.startNewSession(title, captureMode)
      setCurrentSession(session)
      setTranscriptions([])
      setLiveTranscript('')
      setSaveStatus('idle')

      // Start listening based on mode
      if (captureMode === 'system') {
        await audioService.current.startSystemAudioCapture((result: TranscriptionResult) => {
          console.log('📝 New transcription:', result.text)
          setTranscriptions(prev => [...prev, result])
          setLiveTranscript(result.text)
          
          // Auto-scroll to bottom
          setTimeout(() => {
            if (transcriptRef.current) {
              transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
            }
          }, 100)
        })
      } else if (captureMode === 'tab') {
        await audioService.current.startTabAudioCapture((result: TranscriptionResult) => {
          console.log('📝 New transcription:', result.text)
          setTranscriptions(prev => [...prev, result])
          setLiveTranscript(result.text)
          
          // Auto-scroll to bottom
          setTimeout(() => {
            if (transcriptRef.current) {
              transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
            }
          }, 100)
        })
      } else if (captureMode === 'microphone') {
        await audioService.current.startMicrophoneCapture((result: TranscriptionResult) => {
          console.log('📝 New transcription:', result.text)
          setTranscriptions(prev => [...prev, result])
          setLiveTranscript(result.text)
          
          // Auto-scroll to bottom
          setTimeout(() => {
            if (transcriptRef.current) {
              transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
            }
          }, 100)
        })
      }

      setIsListening(true)
      console.log(`🔊 Started listening to ${captureMode} audio`)
    } catch (error) {
      console.error('Error starting audio:', error)
      alert(`Failed to start audio capture: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleStopListening = () => {
    if (!isListening) return

    audioService.current.stopListening()
    setIsListening(false)
    setLiveTranscript('')
    console.log('🛑 Stopped listening')
  }

  const handleSaveToGoogleDocs = async () => {
    if (!currentSession || !user || !googleConnection.isConnected) return

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      console.log('💾 Saving system audio note to Google Docs...')
      
      // Create document from current session
      const doc = await docsService.current.createDocumentFromAudioNote(currentSession)
      
      console.log('✅ Successfully saved to Google Docs:', doc.title)
      setSaveStatus('success')
      
      // Refresh recent docs
      await loadRecentDocs()
      
      // Reset session after successful save
      setTimeout(() => {
        setCurrentSession(null)
        setTranscriptions([])
        setSaveStatus('idle')
        setSessionTitle('')
      }, 2000)
      
    } catch (error) {
      console.error('❌ Error saving to Google Docs:', error)
      setSaveStatus('error')
      alert(`Failed to save to Google Docs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscardSession = () => {
    if (isListening) {
      handleStopListening()
    }
    setCurrentSession(null)
    setTranscriptions([])
    setLiveTranscript('')
    setSaveStatus('idle')
    setSessionTitle('')
  }

  if (!browserSupport) {
    return (
      <div className={`bg-red-500/10 border border-red-400/20 rounded-lg p-4 ${className}`}>
        <div className="text-red-300 text-sm text-center">
          ❌ Checking browser support...
        </div>
      </div>
    )
  }

  // Check if any audio capture is supported
  const hasAnyAudioSupport = browserSupport.systemAudio || browserSupport.tabAudio || browserSupport.microphone

  if (!hasAnyAudioSupport) {
    return (
      <div className={`bg-red-500/10 border border-red-400/20 rounded-lg p-4 ${className}`}>
        <div className="text-red-300 text-sm text-center">
          ❌ Audio capture not supported in this browser
        </div>
        <div className="text-red-200 text-xs text-center mt-2">
          {browserSupport.recommendedBrowser}
        </div>
        {browserSupport.limitations.length > 0 && (
          <div className="text-red-200 text-xs text-center mt-1">
            {browserSupport.limitations.join(', ')}
          </div>
        )}
      </div>
    )
  }

  if (!hasOpenAIKey) {
    return (
      <div className={`bg-yellow-500/10 border border-yellow-400/20 rounded-lg p-4 ${className}`}>
        <div className="text-yellow-300 text-sm text-center">
          ⚠️ OpenAI API key required for transcription
        </div>
        <div className="text-yellow-200 text-xs text-center mt-2">
          Add VITE_OPENAI_API_KEY to your .env file to use audio transcription
        </div>
      </div>
    )
  }

  if (!user || !googleConnection.isConnected) {
    return (
      <div className={`bg-yellow-500/10 border border-yellow-400/20 rounded-lg p-4 ${className}`}>
        <div className="text-yellow-300 text-sm text-center">
          🔐 Sign in to Google to use System Audio Notes
        </div>
        <div className="text-yellow-200 text-xs text-center mt-2">
          Transcriptions will be saved to Google Docs
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-orange-500/10 border border-orange-400/20 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-orange-400/20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-medium text-sm">🔊 System Audio Notes</h3>
          <div className={`w-3 h-3 rounded-full ${
            isListening ? 'bg-red-400 animate-pulse' : 
            currentSession ? 'bg-yellow-400' : 'bg-gray-400'
          }`} title={
            isListening ? 'Recording system audio...' : 
            currentSession ? 'Session active' : 'Ready'
          } />
        </div>

        {/* Capture Mode Toggle */}
        {!isListening && (
          <div className="mb-3">
            <div className="flex gap-2">
              {browserSupport.systemAudio && (
                <button
                  onClick={() => setCaptureMode('system')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    captureMode === 'system'
                      ? 'bg-orange-500/30 border border-orange-400/50 text-white'
                      : 'bg-orange-500/10 border border-orange-400/20 text-white/70 hover:bg-orange-500/20'
                  }`}
                >
                  🖥️ Full Screen Audio
                </button>
              )}
              {browserSupport.tabAudio && (
                <button
                  onClick={() => setCaptureMode('tab')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    captureMode === 'tab'
                      ? 'bg-orange-500/30 border border-orange-400/50 text-white'
                      : 'bg-orange-500/10 border border-orange-400/20 text-white/70 hover:bg-orange-500/20'
                  }`}
                >
                  🌐 Tab Audio
                </button>
              )}
              {browserSupport.microphone && (
                <button
                  onClick={() => setCaptureMode('microphone')}
                  className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                    captureMode === 'microphone'
                      ? 'bg-orange-500/30 border border-orange-400/50 text-white'
                      : 'bg-orange-500/10 border border-orange-400/20 text-white/70 hover:bg-orange-500/20'
                  }`}
                >
                  🎤 Microphone
                </button>
              )}
            </div>
            <div className="text-xs text-white/60 mt-1 text-center">
              {captureMode === 'system' 
                ? 'Capture all system audio (Zoom, music, etc.)'
                : captureMode === 'tab'
                ? 'Capture specific browser tab audio'
                : 'Capture audio from your microphone'
              }
            </div>
            {browserSupport.limitations.length > 0 && (
              <div className="text-xs text-yellow-400/60 mt-1 text-center">
                ⚠️ {browserSupport.limitations.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Session Title Input */}
        {!isListening && (
          <input
            type="text"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="Session title (optional)"
            className="w-full bg-orange-500/10 border border-orange-400/20 rounded px-3 py-1.5 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400/50 mb-3"
            disabled={isListening}
          />
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!isListening ? (
            <button
              onClick={handleStartListening}
              disabled={isSaving}
              className="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded text-red-300 text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              🔊 Capture {captureMode === 'system' ? 'System' : captureMode === 'tab' ? 'Tab' : 'Microphone'} Audio
            </button>
          ) : (
            <button
              onClick={handleStopListening}
              className="flex-1 px-3 py-2 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-400/30 rounded text-gray-300 text-sm transition-colors flex items-center justify-center gap-2"
            >
              ⏹️ Stop Capture
            </button>
          )}
        </div>

        {/* Instructions */}
        {!isListening && (
          <div className="mt-2 text-xs text-white/50 text-center">
            {captureMode === 'system' 
              ? '💡 Will capture all computer audio (Zoom calls, YouTube, etc.)'
              : captureMode === 'tab'
              ? '💡 Select a browser tab to capture its audio'
              : '💡 Speak into your microphone to capture audio'
            }
          </div>
        )}
      </div>

      {/* Live Status */}
      {isListening && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-orange-400/10">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <div className="text-red-300 text-sm">
              Recording {captureMode} audio - transcribing with AI...
            </div>
          </div>
          {liveTranscript && (
            <div className="text-white/80 text-sm italic mt-2 text-center">
              "{liveTranscript}"
            </div>
          )}
        </div>
      )}

      {/* Session Content */}
      {currentSession && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-white/90 font-medium text-sm">{currentSession.title}</div>
            <div className="text-white/60 text-xs flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs ${
                currentSession.source === 'system' 
                  ? 'bg-orange-500/20 text-orange-300' 
                  : currentSession.source === 'tab'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-green-500/20 text-green-300'
              }`}>
                {currentSession.source === 'system' ? '🖥️ System' : currentSession.source === 'tab' ? '🌐 Tab' : '🎤 Microphone'}
              </span>
              {transcriptions.length} transcription{transcriptions.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Transcriptions */}
          <div 
            ref={transcriptRef}
            className="bg-black/20 border border-orange-400/10 rounded p-3 max-h-40 overflow-y-auto custom-scrollbar"
          >
            {transcriptions.length > 0 ? (
              <div className="space-y-2">
                {transcriptions.map((transcription, index) => (
                  <div key={index} className="text-sm">
                    <div className="text-white/60 text-xs mb-1 flex items-center gap-2">
                      {transcription.timestamp.toLocaleTimeString()}
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        transcription.source === 'system' 
                          ? 'bg-orange-500/20 text-orange-300' 
                          : transcription.source === 'tab'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-green-500/20 text-green-300'
                      }`}>
                        {transcription.source}
                      </span>
                    </div>
                    <div className="text-white/90">{transcription.text}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/40 text-sm text-center py-4">
                {isListening ? 'Listening for system audio...' : 'No transcriptions yet'}
              </div>
            )}
          </div>

          {/* Session Actions */}
          {!isListening && transcriptions.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleSaveToGoogleDocs}
                disabled={isSaving}
                className={`flex-1 px-3 py-2 border rounded text-sm transition-colors ${
                  saveStatus === 'success' 
                    ? 'bg-green-500/20 border-green-400/30 text-green-300'
                    : saveStatus === 'error'
                    ? 'bg-red-500/20 border-red-400/30 text-red-300'
                    : 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-400/30 text-orange-300'
                } disabled:opacity-50`}
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : saveStatus === 'success' ? (
                  '✅ Saved to Docs'
                ) : saveStatus === 'error' ? (
                  '❌ Save Failed'
                ) : (
                  '📄 Save to Google Docs'
                )}
              </button>
              
              <button
                onClick={handleDiscardSession}
                disabled={isSaving}
                className="px-3 py-2 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-400/30 rounded text-gray-300 text-sm transition-colors disabled:opacity-50"
              >
                🗑️ Discard
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent Docs */}
      {!currentSession && recentDocs.length > 0 && (
        <div className="px-4 py-3 border-t border-orange-400/10">
          <div className="text-white/80 text-sm mb-2">📚 Recent System Audio Notes</div>
          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 bg-orange-500/5 hover:bg-orange-500/10 border border-orange-400/10 rounded cursor-pointer transition-colors"
                onClick={() => window.open(doc.webViewLink, '_blank')}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-white/90 text-sm truncate">{doc.title}</div>
                  <div className="text-white/60 text-xs">
                    {new Date(doc.modifiedTime).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-orange-300 text-xs ml-2">📄</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Footer */}
      <div className="px-4 py-2 bg-orange-500/5 border-t border-orange-400/10 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-white/40">
          <div>
            {isListening ? '🔴 Capturing system audio' : 
             currentSession ? '⏸️ Session paused' : 
             '✅ Ready to capture'}
          </div>
          <div>
            AI transcription via OpenAI Whisper
          </div>
        </div>
      </div>
    </div>
  )
}