import React from 'react'
import type { CleanupCandidate } from '../../electron/preload'

interface CleanupModeProps {
  googleConnection: any
  cleanupCandidates: CleanupCandidate[]
  loadCleanupCandidates: () => void
  handleDeleteFiles: (fileIds: string[]) => void
}

export const CleanupMode: React.FC<CleanupModeProps> = ({
  googleConnection,
  cleanupCandidates,
  loadCleanupCandidates,
  handleDeleteFiles
}) => {
  return (
    <div className="p-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Drive Cleanup</h3>
          <button
            onClick={loadCleanupCandidates}
            disabled={!googleConnection.isConnected}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded text-sm text-white transition-colors disabled:opacity-50"
          >
            Scan
          </button>
        </div>
        
        {cleanupCandidates.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {cleanupCandidates.slice(0, 10).map((candidate) => (
              <div
                key={candidate.id}
                className="bg-red-500/10 border border-red-400/20 rounded-lg p-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-white/90 text-sm font-medium truncate">
                      {candidate.name}
                    </div>
                    <div className="text-red-300 text-xs mt-1">
                      {candidate.reason} • {candidate.confidence} confidence
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteFiles([candidate.id])}
                    className="ml-2 px-2 py-1 bg-red-500/30 hover:bg-red-500/50 rounded text-xs text-white transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            
            {cleanupCandidates.length > 10 && (
              <div className="text-center">
                <button
                  onClick={() => {
                    const selectedIds = cleanupCandidates
                      .filter(c => c.confidence === 'high')
                      .map(c => c.id)
                    handleDeleteFiles(selectedIds)
                  }}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded text-sm text-white transition-colors"
                >
                  Delete All High Confidence ({cleanupCandidates.filter(c => c.confidence === 'high').length})
                </button>
              </div>
            )}
          </div>
        )}
        
        {cleanupCandidates.length === 0 && (
          <div className="text-center text-white/60 py-8">
            No cleanup candidates found.<br />
            Click "Scan" to analyze your Drive.
          </div>
        )}
      </div>
    </div>
  )
} 