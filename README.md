![Cluely_Announcement_Twitter-R1](https://github.com/user-attachments/assets/51a28506-5947-448c-8dd7-f229315008c6)

# Wingman

Copyright (c) 2025 Jiwon Jeong

This source code is intended for demonstration purposes only.
All rights reserved. No part of this code may be reproduced, distributed, or transmitted in any form or by any means without the prior written permission of the author.

A desktop application to help you cheat on everything, but there's a twist: we have integration with Google Drive, Calendar, and other Google services.

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher) installed on your computer
- Git installed on your computer
- OpenAI API key (get it from [OpenAI Platform](https://platform.openai.com/api-keys))
- Google Maps API key (optional, for location features)
- Google OAuth credentials (for Google Drive and Calendar integration)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone [repository-url]
   cd cluely-clone
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a file named `.env` in the root folder and add:
   ```env
   # Required
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   
   # Optional (for location features)
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   
   # For Google OAuth (if using Google services)
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   ```

4. **Set up the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## Running the App

### Method 1: Development Mode (Recommended for first run)
1. Open a terminal and run:
   ```bash
   npm run dev
   ```
   This will start both the Vite dev server and Electron app automatically.

### Method 2: Manual Development Mode
If you prefer to run them separately:
1. Start the Vite dev server:
   ```bash
   npm run dev:vite
   ```
2. In another terminal, start Electron:
   ```bash
   npm run dev:electron
   ```

### Method 3: Production Mode
```bash
npm run build
npm run dist
```
The built app will be in the `release` folder.

## 🎯 Features

### Available Modes
- **Chat Mode**: AI-powered conversation with context from your files and calendar
- **Drive Mode**: Sync and manage Google Drive files
- **Cleanup Mode**: Identify and remove unnecessary files
- **Organize Mode**: AI-powered file organization suggestions
- **Calendar Mode**: View and create Google Calendar events
- **Maps Mode**: Location-based services and place search
- **Profile Mode**: User settings and account management

### Key Features
- **AI Integration**: Powered by OpenAI for intelligent assistance
- **Google Services**: Seamless integration with Drive, Calendar, and Maps
- **File Management**: Smart file cleanup and organization
- **Calendar Management**: View and create events with AI assistance
- **Location Services**: Maps integration for location-based queries
- **Screenshot Capture**: Built-in screen capture for context
- **Audio Processing**: Voice input and processing capabilities

## ⌨️ Keyboard Shortcuts

- `Cmd/Ctrl + B`: Toggle window visibility
- `Cmd/Ctrl + H`: Take screenshot
- `Cmd/Enter`: Get AI solution
- `Cmd/Ctrl + Arrow Keys`: Move window
- `Cmd/Ctrl + Q`: Quit application

## ⚠️ Important Notes

### Closing the App
- Press `Cmd + Q` (Mac) or `Ctrl + Q` (Windows/Linux) to quit
- Or use Activity Monitor/Task Manager to close the app
- The X button may not work in some cases (known issue)

### Port Usage
- The app uses port `5173` by default
- If the app doesn't start, make sure no other app is using this port
- To kill existing processes:
  ```bash
  # Find processes using port 5173
  lsof -i :5173
  # Kill them (replace [PID] with the process ID)
  kill [PID]
  ```
