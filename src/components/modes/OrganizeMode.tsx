import React from 'react'
import type { User, GoogleConnection } from '../../../electron/preload'

interface OrganizeModeProps {
  user: User
  googleConnection: GoogleConnection
  organizationClusters: any[]
  isAnalyzing: boolean
  analyzeForOrganization: () => void
}

export const OrganizeMode: React.FC<OrganizeModeProps> = ({
  user,
  googleConnection,
  organizationClusters,
  isAnalyzing,
  analyzeForOrganization
}) => {
  return (
    <div className="p-4" style={{ WebkitAppRegion: 'no-drag' }}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">File Organization</h3>
          <button
            onClick={analyzeForOrganization}
            disabled={isAnalyzing || !googleConnection.isConnected}
            className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded text-sm text-white transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        
        {organizationClusters.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {organizationClusters.map((cluster) => (
              <div
                key={cluster.id}
                className="bg-green-500/10 border border-green-400/20 rounded-lg p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-white/90 text-sm font-medium">
                      {cluster.name}
                    </div>
                    <div className="text-green-300 text-xs mt-1">
                      {cluster.files.length} files • {cluster.category}
                    </div>
                    <div className="text-white/60 text-xs mt-1">
                      → {cluster.suggestedFolderName}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const result = await window.electronAPI.drive.organizeFiles({
                          clusters: [cluster]
                        })
                        if (result.success) {
                          console.log('Organization completed for cluster:', cluster.name)
                        }
                      } catch (error) {
                        console.error('Error organizing cluster:', error)
                      }
                    }}
                    className="ml-2 px-2 py-1 bg-green-500/30 hover:bg-green-500/50 rounded text-xs text-white transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {organizationClusters.length === 0 && !isAnalyzing && (
          <div className="text-center text-white/60 py-8">
            No organization suggestions.<br />
            Click "Analyze" to get smart folder suggestions.
          </div>
        )}
      </div>
    </div>
  )
}