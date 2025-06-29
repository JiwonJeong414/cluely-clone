import { ipcMain } from 'electron'
import { AuthService } from '../../src/services/auth/AuthService'

export function setupAuthHandlers(authService: AuthService) {
  // Get current user
  ipcMain.handle('auth-get-user', async () => {
    try {
      return authService.getCurrentUser()
    } catch (error) {
      console.error('Error getting user:', error)
      return null
    }
  })

  // Sign in with Google
  ipcMain.handle('auth-sign-in', async () => {
    try {
      const user = await authService.signInWithGoogle()
      return { success: true, user }
    } catch (error) {
      console.error('Error signing in:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      }
    }
  })

  // Sign out
  ipcMain.handle('auth-sign-out', async () => {
    try {
      await authService.signOut()
      return { success: true }
    } catch (error) {
      console.error('Error signing out:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      }
    }
  })

  // Get Google connection status
  ipcMain.handle('auth-get-google-connection', async () => {
    try {
      return authService.getGoogleConnection()
    } catch (error) {
      console.error('Error getting Google connection:', error)
      return { isConnected: false }
    }
  })

  // Keep the old handler for backward compatibility
  ipcMain.handle('auth-get-drive-connection', async () => {
    try {
      return authService.getGoogleConnection()
    } catch (error) {
      console.error('Error getting Google connection:', error)
      return { isConnected: false }
    }
  })
}