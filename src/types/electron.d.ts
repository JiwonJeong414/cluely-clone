import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  toggleWindow: () => ipcRenderer.invoke('toggle-window'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  updateContentDimensions: (dimensions: { width: number; height: number }) => ipcRenderer.invoke('update-content-dimensions', dimensions),
  dragWindow: (deltas: { deltaX: number; deltaY: number }) => ipcRenderer.invoke('drag-window', deltas),
  getAvailableScreens: () => ipcRenderer.invoke('get-available-screens'),
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  captureScreenById: (sourceId: string) => ipcRenderer.invoke('capture-screen-by-id', sourceId),
  onShortcutTestSuccess: (callback: () => void) => {
    ipcRenderer.on('shortcut-test-success', callback)
  },
  onScreenshotCaptured: (callback: (screenshot: string) => void) => {
    ipcRenderer.on('screenshot-captured', (_, screenshot) => callback(screenshot))
  },
})

// Type definitions
export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  toggleWindow: () => Promise<void>
  hideWindow: () => Promise<void>
  showWindow: () => Promise<void>
  updateContentDimensions: (dimensions: { width: number; height: number }) => Promise<void>
  dragWindow: (deltas: { deltaX: number; deltaY: number }) => Promise<void>
  getAvailableScreens: () => Promise<Array<{ id: string; name: string; thumbnail: string; display_id: string }>>
  captureScreen: () => Promise<string>
  captureScreenById: (sourceId: string) => Promise<string>
  onShortcutTestSuccess: (callback: () => void) => void
  onScreenshotCaptured: (callback: (screenshot: string) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
