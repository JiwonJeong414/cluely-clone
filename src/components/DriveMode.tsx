import React from 'react'
import type { AppMode } from '../hooks/useAppState'

interface DriveModeProps {
  googleConnection: any
  isSyncing: boolean
  syncProgress: any
  syncStats: any
  handleQuickSync: () => void
  handleDeepSync: () => void
  handleForceSync: () => void
  setCurrentMode: (mode: AppMode) => void
}

export const DriveMode: React.FC<DriveModeProps> = ({
  googleConnection,
  isSyncing,
  syncProgress,
  syncStats,
  handleQuickSync,
  handleDeepSync,
  handleForceSync,
  setCurrentMode
}) => {
  return (
    <div className="p-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-medium">Drive Management</h3>
          <div className="flex gap-2">
            <button
              onClick={handleQuickSync}
              disabled={isSyncing || !googleConnection.isConnected}
              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded transition-colors disabled:opacity-50"
              title="Sync 5 new files"
            >
              {isSyncing ? 'Syncing...' : 'Quick'}
            </button>
            <button
              onClick={handleDeepSync}
              disabled={isSyncing || !googleConnection.isConnected}
              className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs rounded transition-colors disabled:opacity-50"
              title="Sync 20 new files"
            >
              Deep
            </button>
            <button
              onClick={handleForceSync}
              disabled={isSyncing || !googleConnection.isConnected}
              className="px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs rounded transition-colors disabled:opacity-50"
              title="Force reindex 10 files"
            >
              Force
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className={`text-xs px-3 py-2 rounded-lg border ${
          googleConnection.isConnected 
            ? 'bg-green-500/10 border-green-400/20 text-green-300'
            : 'bg-red-500/10 border-red-400/20 text-red-300'
        }`}>
          {googleConnection.isConnected ? '✅ Drive Connected' : '❌ Drive Disconnected'}
        </div>

        {/* Sync Stats */}
        {syncStats && (
          <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
            <div className="text-white/80 text-sm mb-2">📊 Sync Statistics</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-white/60">
                📄 Documents: <span className="text-white">{syncStats.totalDocuments}</span>
              </div>
              <div className="text-white/60">
                🧠 Indexed: <span className="text-white">{syncStats.indexedFiles}</span>
              </div>
              <div className="text-white/60">
                🔗 Embeddings: <span className="text-white">{syncStats.totalEmbeddings}</span>
              </div>
              <div className="text-white/60">
                📈 Avg/File: <span className="text-white">{syncStats.averageEmbeddingsPerFile?.toFixed(1) || '0'}</span>
              </div>
            </div>
            {syncStats.lastSyncTime && (
              <div className="text-white/60 text-xs mt-2">
                🕒 Last sync: {new Date(syncStats.lastSyncTime).toLocaleString()}
              </div>
            )}
          </div>
        )}
        
        {syncProgress && (
          <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
            <div className="text-white/80 text-sm mb-2">
              Processing: {syncProgress.currentFile}
            </div>
            <div className="w-full bg-blue-500/20 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(syncProgress.processedFiles / syncProgress.totalFiles) * 100}%` }}
              />
            </div>
            <div className="text-white/60 text-xs mt-1">
              {syncProgress.processedFiles}/{syncProgress.totalFiles} files • {syncProgress.embeddingsCreated} indexed • {syncProgress.skipped} skipped
            </div>
            {syncProgress.errors > 0 && (
              <div className="text-red-300 text-xs mt-1">
                ⚠️ {syncProgress.errors} errors
              </div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setCurrentMode('cleanup')}
            className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 rounded-lg text-white/80 text-sm transition-colors"
          >
            🗑️ Cleanup
          </button>
          <button
            onClick={() => setCurrentMode('organize')}
            className="p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-400/30 rounded-lg text-white/80 text-sm transition-colors"
          >
            📁 Organize
          </button>
        </div>

        {/* Sync Strategy Explanation */}
        <div className="text-xs text-white/40 space-y-1">
          <div>💡 <strong>Quick:</strong> 5 newest unprocessed files</div>
          <div>🔍 <strong>Deep:</strong> 20 newest unprocessed files</div>
          <div>🔄 <strong>Force:</strong> Reprocess 10 recent files</div>
        </div>
      </div>
    </div>
  )
} 