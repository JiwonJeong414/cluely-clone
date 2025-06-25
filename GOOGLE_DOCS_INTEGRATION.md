# Google Docs Integration

## Overview

The Wingman application now includes automatic Google Docs note creation for screenshots and audio captures. After capturing a screenshot or recording audio, Wingman will automatically create a Google Doc with the analysis and store it in your Google Drive.

## Features

### Automatic Note Creation

1. **Screenshot Notes**: When you capture a screenshot, Wingman will:
   - Analyze the screenshot using AI vision
   - Create a Google Doc with the analysis
   - Include the original screenshot URL and user question
   - Format the document with proper styling

2. **Audio Notes**: When you record audio, Wingman will:
   - Transcribe the audio
   - Analyze the transcription with AI
   - Create a Google Doc with both transcription and analysis
   - Include metadata like recording duration

3. **Conversation Notes**: For substantial conversations, Wingman will:
   - Create a Google Doc with the full conversation
   - Include AI analysis and insights
   - Format with user and assistant messages clearly separated

### User Interface

- **Notification System**: Shows success/error messages when creating notes
- **Loading Indicator**: Displays "Creating Google Doc..." while processing
- **Recent Docs Button**: Click the 📝 button to view recent Google Docs
- **Direct Access**: Click on any recent doc to open it in Google Docs

## How It Works

### Screenshot Flow
1. User captures screenshot (Cmd+Shift+S)
2. User types a question about the screenshot
3. Wingman analyzes the screenshot with AI vision
4. Automatically creates a Google Doc with:
   - Title: "Screenshot Analysis - [Date]"
   - AI analysis of the screenshot
   - User's question
   - Timestamp and metadata

### Audio Flow
1. User clicks the microphone button
2. User records audio
3. Wingman transcribes the audio
4. AI analyzes the transcription
5. Automatically creates a Google Doc with:
   - Title: "Audio Capture - [Date]"
   - Full transcription
   - AI analysis and insights
   - Audio metadata

### Conversation Flow
1. User has a substantial conversation with Wingman
2. If the response is longer than 100 characters
3. Automatically creates a Google Doc with:
   - Title: "Conversation - [Date]"
   - Full conversation history
   - AI summary and insights

## Google Docs Format

Each Google Doc is formatted with:
- **Title**: Styled as a Google Docs title
- **Timestamp**: When the note was created
- **Type**: Screenshot, Audio, or Conversation
- **Metadata**: Relevant information (screenshot URL, audio duration, etc.)
- **Content**: AI analysis and insights
- **Proper formatting**: Uses Google Docs styling for readability

## Requirements

- Google account connected to the application
- Google Drive API access
- Google Docs API access
- Internet connection for API calls

## API Endpoints

The integration uses the following IPC endpoints:

- `docs-create-screenshot-note`: Creates notes from screenshots
- `docs-create-audio-note`: Creates notes from audio captures
- `docs-create-conversation-note`: Creates notes from conversations
- `docs-list-recent`: Lists recent Google Docs
- `docs-get-doc`: Gets specific document details
- `docs-append-to-note`: Appends content to existing notes

## Error Handling

- Network errors are caught and displayed to the user
- Failed note creation shows error notifications
- Graceful fallback if Google services are unavailable
- Automatic retry logic for transient failures

## Privacy & Security

- All notes are created in your personal Google Drive
- No data is stored locally beyond the application
- Uses OAuth2 authentication for secure access
- Respects Google's privacy policies and data handling

## Troubleshooting

### Common Issues

1. **"Failed to create note" error**
   - Check Google account connection
   - Verify Google Drive API access
   - Check internet connection

2. **Notes not appearing in Google Drive**
   - Check Google Drive folder permissions
   - Verify the Google account is correct
   - Check for any Google Drive sync issues

3. **Authentication errors**
   - Sign out and sign back in
   - Check Google account permissions
   - Verify OAuth2 scopes are granted

### Debug Information

Check the browser console (F12) for detailed error messages and API call logs.

## Future Enhancements

- Custom folder organization for notes
- Note templates and formatting options
- Bulk note management
- Note sharing and collaboration features
- Integration with Google Keep for quick notes 