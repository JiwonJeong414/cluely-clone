import { ipcMain, BrowserWindow, app } from 'electron'

export function setupWindowHandlers(mainWindow: BrowserWindow | null, isWindowVisible: boolean) {
  // Basic window operations
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('toggle-window', () => {
    // This will be handled by the main app class
  })

  ipcMain.handle('hide-window', () => {
    // This will be handled by the main app class
  })

  ipcMain.handle('show-window', () => {
    // This will be handled by the main app class
  })

  // Window dimension updates
  ipcMain.handle('update-content-dimensions', async (event, { width, height }) => {
    console.log('Updating window dimensions:', { width, height })
    
    if (!mainWindow || !width || !height || width <= 0 || height <= 0) {
      return
    }

    try {
      const padding = 20
      const newWidth = Math.max(Math.min(width + padding, 800), 400)
      const newHeight = Math.max(Math.min(height + padding, 600), 120)
      
      mainWindow.setSize(newWidth, newHeight, true)
      console.log('Window resized successfully')
    } catch (error) {
      console.error('Error updating window dimensions:', error)
    }
  })

  // Window dragging
  ipcMain.handle('drag-window', async (event, { deltaX, deltaY }) => {
    if (mainWindow) {
      const currentBounds = mainWindow.getBounds()
      const newX = currentBounds.x + deltaX
      const newY = currentBounds.y + deltaY
      
      mainWindow.setPosition(newX, newY, false)
    }
  })

  // Center window
  ipcMain.handle('center-window', () => {
    // This will be handled by the main app class
  })

  // Shortcut test handler
  ipcMain.on('shortcut-test-success', () => {
    console.log('Shortcut test success received')
  })
}