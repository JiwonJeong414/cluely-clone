# Audio Capture Testing Guide

## How to Test the Audio Capture Feature

### 1. Start the Application
```bash
npm run dev
```

### 2. Testing Steps

1. **Click the microphone button** (🎤) next to the chat input
2. **Grant screen sharing permissions** when prompted by your browser/OS
3. **Play some audio** on your computer (music, video, etc.)
4. **Click the stop button** (🎤 with X) to stop recording
5. **Wait for processing** - the AI will transcribe and analyze the audio

### 3. What to Expect

- **Starting**: Button shows "Starting capture..." status
- **Recording**: Button turns red with a pulsing indicator and shows duration
- **Processing**: Button shows spinner and "Processing audio..." status
- **AI Analysis**: Button shows "Sending to AI..." then "Success!"
- **Result**: The AI response appears in the chat

### 4. Troubleshooting

#### If the button turns white while recording:
1. **Wait a moment** - the system will auto-sync every 2 seconds
2. **Check browser console** (F12) for sync messages
3. **Try clicking again** - it should detect the actual state
4. **Use emergency reset** if stuck: Press `Ctrl+Shift+R`

#### If it says "it's still recording" when you try to start:
1. **Wait for auto-sync** (every 2 seconds)
2. **Check console logs** for actual capture status
3. **Use emergency reset**: Press `Ctrl+Shift+R` to force cleanup
4. **Try again** after reset

#### If it immediately stops recording:
1. **Check browser console** (F12) for error messages
2. **Ensure screen sharing permission** is granted
3. **Try playing audio** before starting capture
4. **Check if your OS supports system audio capture**

#### Common Issues:
- **Permission denied**: Grant screen sharing access
- **No audio sources**: Make sure you have audio playing
- **API errors**: Check if OpenAI API key is set in `.env`
- **State sync issues**: Use `Ctrl+Shift+R` to reset

### 5. Emergency Reset

If the audio capture gets stuck in a bad state:
- **Press `Ctrl+Shift+R`** to force cleanup
- **Wait for "Reset complete"** message
- **Try recording again**

### 6. Debug Information

The console will show detailed logs:
- `🔍 Checking capture status: true/false`
- `🔄 Syncing capture status: true/false`
- `🎤 Starting audio capture...`
- `📺 Available sources: X`
- `🎯 Using source: [source name]`
- `✅ Stream obtained, tracks: X`
- `🎤 MediaRecorder started successfully`
- `📦 Data available: X bytes`
- `🛑 MediaRecorder stopped, processing data...`
- `🎵 Audio blob size: X bytes`
- `🧹 Cleaning up audio service...`

### 7. System Requirements

- **macOS**: Should work with system audio capture
- **Windows**: May require additional audio routing software
- **Linux**: May need PulseAudio configuration

### 8. Audio Quality Tips

- **Speak clearly** during interviews
- **Minimize background noise**
- **Keep recording under 60 seconds** for best results
- **Use good quality audio sources** for testing

### 9. Interview Use Cases

The AI will help with:
- **Answering interview questions**
- **Providing feedback on responses**
- **Suggesting improvements**
- **Analyzing communication style**

### 10. Next Steps

If you encounter issues:
1. Check the browser console for error messages
2. Verify your `.env` file has `OPENAI_API_KEY=your_key_here`
3. Try with different audio sources
4. Test with shorter recordings first
5. Use `Ctrl+Shift+R` for emergency reset if needed

The audio capture should now work properly and provide real-time feedback during your interview preparation! 