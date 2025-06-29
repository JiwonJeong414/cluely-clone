import React from 'react'

interface NotificationManagerProps {
  docsNotification: { type: 'success' | 'error'; message: string } | null
  isCreatingNote: boolean
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({
  docsNotification,
  isCreatingNote
}) => {
  return (
    <>
      {/* Google Docs Notification */}
      {docsNotification && (
        <div className={`absolute top-16 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
          docsNotification.type === 'success' 
            ? 'bg-green-500/20 border border-green-400/30 text-green-300' 
            : 'bg-red-500/20 border border-red-400/30 text-red-300'
        }`}>
          {docsNotification.message}
        </div>
      )}

      {/* Google Docs Creating Indicator */}
      {isCreatingNote && (
        <div className="absolute top-16 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          Creating Google Doc...
        </div>
      )}
    </>
  )
}