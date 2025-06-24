import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  toggleWindow: () => ipcRenderer.invoke('toggle-window'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  onShortcutTestSuccess: (callback: () => void) => {
    ipcRenderer.on('shortcut-test-success', callback)
  },
})

// Type definitions
export interface ElectronAPI {
  getAppVersion: () => Promise<string>
  toggleWindow: () => Promise<void>
  hideWindow: () => Promise<void>
  showWindow: () => Promise<void>
  onShortcutTestSuccess: (callback: () => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
