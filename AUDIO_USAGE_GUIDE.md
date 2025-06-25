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
6. **Choose your action**: After transcription, you have two options:
   - **Ask a question**: Type your question about the audio content
   - **Create a note**: Type "notes" to save the audio transcription to Google Docs

## Features

### 🎤 **Smart Audio Recording**
- High-quality audio capture with noise suppression
- Real-time recording indicator
- Automatic transcription when you stop recording

### 🧠 **Flexible Processing Options**
- **Normal Queries**: Ask questions about your audio content and get AI responses
- **Note Creation**: Type "notes" to automatically create a Google Docs note with transcription and AI analysis
- **User Choice**: You decide whether to have a conversation or save as a note

### 💬 **Seamless Integration**
- Responses appear directly in your chat interface
- Works alongside your existing text-based conversations
- Maintains conversation context
- Integrates with Google Docs for note-taking

## Usage Examples

### Normal Query Flow
1. Record: "What are good answers to 'Tell me about yourself'?"
2. After transcription, type: "Give me 3 specific examples"
3. Get AI response with interview tips

### Note Creation Flow
1. Record: "Meeting notes from today's client call"
2. After transcription, type: "notes"
3. Google Docs note is automatically created with transcription and AI analysis

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

### Google Docs Note Creation Issues
1. Make sure you're signed in to Google
2. Check that Google Docs integration is enabled
3. Verify you have permission to create documents in your Google Drive

## Example Use Cases

### Interview Preparation
- "What are good answers to 'Tell me about yourself'?"
- "How should I respond to 'What's your biggest weakness'?"
- "Give me feedback on my elevator pitch"

### General Assistance
- "Help me write a professional email"
- "What questions should I ask in a job interview?"
- "How do I negotiate a salary offer?"

### Note Taking
- "Meeting notes from today's client call"
- "Ideas for the new project proposal"
- "Action items from the team meeting"

## Technical Details

- **Audio Format**: WebM with Opus codec (high quality, small file size)
- **Sample Rate**: 44.1kHz for optimal quality
- **Processing**: Server-side transcription and analysis for privacy
- **Response Time**: Typically 2-5 seconds depending on audio length
- **Note Creation**: Automatic Google Docs integration when "notes" keyword is used

## Privacy & Security

- Audio is processed securely through OpenAI's API
- No audio files are stored locally or on servers
- All processing happens in real-time and is discarded after analysis
- Google Docs notes are created only when explicitly requested

The audio functionality is now fully integrated with your existing OpenAI setup and ready to use! 