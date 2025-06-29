import { ipcMain } from 'electron'
import { OrganizationService } from '../../src/services/organization/OrganizationService'
import { AuthService } from '../../src/services/auth/AuthService'

export function setupOrganizationHandlers(organizationService: OrganizationService, authService: AuthService) {
  // Organize files based on plan
  ipcMain.handle('drive-organize-files', async (event, plan) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log('Starting file organization...')
      const result = await organizationService.executeOrganization(user.id, plan)
      
      console.log('[✓] File organization completed:', result)
      return { success: true, result }
    } catch (error) {
      console.error('Drive organize files error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Organization failed' 
      }
    }
  })

  // Analyze files for organization
  ipcMain.handle('drive-analyze-for-organization', async (event, options = {}) => {
    try {
      const user = authService.getCurrentUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      
      console.log('Analyzing files for organization...')
      const analysis = await organizationService.analyzeForOrganization(user.id, options)
      
      console.log(`[✓] Analysis completed: ${analysis.clusters.length} clusters found`)
      return { success: true, analysis }
    } catch (error) {
      console.error('Drive analyze error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Analysis failed' 
      }
    }
  })
}