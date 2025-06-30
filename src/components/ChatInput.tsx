import React, { useState, useRef } from 'react'
import { AudioButton } from './AudioButton'
import type { ChatInputProps } from '../types/components'

/** Text input field with audio recording capabilities for sending messages to the AI assistant. */
export const ChatInput: React.FC<ChatInputProps> = ({
  pendingCapture,
  onSubmit,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || disabled) return
    
    onSubmit?.(inputValue.trim())
    setInputValue('')
  }

  const handleAudioProcessed = (transcription: string) => {
    // Handle audio transcription 
    // Just a debug transcription 
    // TODO: I WILL DELETE THIS LATER
    console.log('Audio transcribed:', transcription)
  }

  return (
    <div className="relative" style={{ WebkitAppRegion: 'no-drag' }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit(e))}
        placeholder={
          pendingCapture 
            ? (pendingCapture.type === 'screenshot' 
                ? "Ask about the screen" 
                : "Ask about the audio")
            : "I'm your AI Wingman, request anything"
        }
        className="w-full bg-blue-500/10 border border-blue-400/20 rounded-lg px-4 py-3 pr-32 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400/50 transition-colors text-sm"
        disabled={disabled}
        autoFocus
      />
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
        <AudioButton 
          onAudioProcessed={handleAudioProcessed}
          className="flex-shrink-0"
        />
        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim() || disabled}
          className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded text-xs transition-colors"
        >
          {disabled ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}