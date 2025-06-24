import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  toggleWindow: () => ipcRenderer.invoke('toggle-window'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  updateContentDimensions: (dimensions: { width: number; height: number }) => 
    ipcRenderer.invoke('update-content-dimensions', dimensions),
  dragWindow: (deltaX: number, deltaY: number) => 
    ipcRenderer.invoke('drag-window', deltaX, deltaY),
  centerWindow: () => ipcRenderer.invoke('center-window'),
  onShortcutTestSuccess: (callback: () => void) => {
    ipcRenderer.on('shortcut-test-success', callback)
  },
  
  // New screen capture methods
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  getAvailableScreens: () => ipcRenderer.invoke('get-available-screens'),
  captureScreenById: (sourceId: string) => ipcRenderer.invoke('capture-screen-by-id', sourceId),
  onScreenshotCaptured: (callback: (screenshot: string) => void) => {
    ipcRenderer.on('screenshot-captured', (event, screenshot) => callback(screenshot))
  },
})

// Type definitions
export interface ScreenSource {
  id: string
  name: string
  thumbnail: string
  display_id: string
}

export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  toggleWindow: () => Promise<void>
  hideWindow: () => Promise<void>
  showWindow: () => Promise<void>
  updateContentDimensions: (dimensions: { width: number; height: number }) => Promise<void>
  dragWindow: (deltaX: number, deltaY: number) => Promise<void>
  centerWindow: () => Promise<void>
  onShortcutTestSuccess: (callback: () => void) => void
  
  // Screen capture methods
  captureScreen: () => Promise<string>
  getAvailableScreens: () => Promise<ScreenSource[]>
  captureScreenById: (sourceId: string) => Promise<string>
  onScreenshotCaptured: (callback: (screenshot: string) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}