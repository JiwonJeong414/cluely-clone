# Audio Recording & Analysis Guide

## Overview
Your app now has audio recording and analysis functionality using OpenAI's Whisper API for transcription and GPT-4 for intelligent responses. This is perfect for interview preparation, voice notes, and getting AI assistance through voice input.

## Setup Requirements

### 1. OpenAI API Key
Make sure you have a `VITE_OPENAI_API_KEY` in your `.env` file:
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

**Note**: The app will also check for `OPENAI_API_KEY` as a fallback, but `VITE_OPENAI_API_KEY` is preferred.

### 2. How to Use

1. **Start the app**: Run `npm run dev` to start the development server
2. **Find the microphone button**: Look for the 🎤 icon next to the chat input field
3. **Click to start recording**: The button will turn red with a pulsing indicator
4. **Speak your message**: Ask a question, request help, or describe what you need
5. **Click to stop recording**: The button will show a loading spinner while processing
6. **Get your response**: The transcribed text and AI response will appear in the chat

## Features

### 🎤 **Smart Audio Recording**
- High-quality audio capture with noise suppression
- Real-time recording indicator
- Automatic processing when you stop recording

### 🧠 **AI-Powered Analysis**
- **Whisper API**: Converts your speech to text with high accuracy
- **GPT-4**: Provides intelligent, contextual responses
- **Interview Focus**: Optimized for interview preparation and professional communication

### 💬 **Seamless Integration**
- Responses appear directly in your chat interface
- Works alongside your existing text-based conversations
- Maintains conversation context

## Troubleshooting

### "OpenAI API key not found" Error
1. Check that your `.env` file contains `VITE_OPENAI_API_KEY=your_key_here`
2. Make sure the key starts with `sk-` (for OpenAI API keys)
3. Restart the development server after adding the key

### Recording Issues
1. Allow microphone permissions when prompted
2. Check that your microphone is working in other applications
3. Try refreshing the page if permissions are denied

### Processing Errors
1. Check your internet connection
2. Verify your OpenAI API key is valid and has credits
3. Check the browser console for detailed error messages

## Example Use Cases

### Interview Preparation
- "What are good answers to 'Tell me about yourself'?"
- "How should I respond to 'What's your biggest weakness'?"
- "Give me feedback on my elevator pitch"

### General Assistance
- "Help me write a professional email"
- "What questions should I ask in a job interview?"
- "How do I negotiate a salary offer?"

## Technical Details

- **Audio Format**: WebM with Opus codec (high quality, small file size)
- **Sample Rate**: 44.1kHz for optimal quality
- **Processing**: Server-side transcription and analysis for privacy
- **Response Time**: Typically 2-5 seconds depending on audio length

## Privacy & Security

- Audio is processed securely through OpenAI's API
- No audio files are stored locally or on servers
- All processing happens in real-time and is discarded after analysis

The audio functionality is now fully integrated with your existing OpenAI setup and ready to use! 