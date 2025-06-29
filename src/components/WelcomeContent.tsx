import React from 'react'
import type { User, GoogleConnection } from '../../electron/preload'
import type { WelcomeContentProps } from '../types/components'

/** Welcome screen with smart suggestions and app status information for new users. */
export const WelcomeContent: React.FC<WelcomeContentProps> = ({
  user,
  googleConnection,
  onSuggestionClick
}) => {
  const getSmartSuggestions = (): string[] => {
    const suggestions = [
      "Answer this Leetcode Question",
      "Explain Quantum Computing",
      "Find free time in my schedule",
      "Search my drive for project documents",
      "Find documents about budget planning",
      "Look for files related to marketing",
      "Find nearby restaurants",
      "How long to get to...",
    ]
    
    if (googleConnection.isConnected) {
      suggestions.push(
        "Schedule a meeting with John tomorrow at 2pm",
        "Book a 1-hour call with the team",
        "Create an event for project review",
        "Set up a meeting at the office",
        "What's my availability this week?",
        "Search my drive for meeting notes",
        "Find documents about quarterly reports",
        "Look for files related to client proposals"
      )
    }
    
    return suggestions
  }

  return (
    <div className="p-5 bg-black/30">
      <div className="text-center">
        <h2 className="text-white text-lg mb-2">
          {user ? `Welcome back, ${user.displayName?.split(' ')[0]}!` : 'Ready to help'}
        </h2>
        <p className="text-white/50 text-sm mb-4">
          {googleConnection.isConnected 
            ? "I'm here to help you stay organized and get things done. Just let me know what you need."
            : 'Type above, press ⌘⇧S to capture screen, or sign in for Drive & Calendar access'
          }
        </p>
        
        {/* Smart Suggestions */}
        {user && googleConnection.isConnected && (
          <div className="mb-4">
            <div className="text-white/40 text-xs mb-2">Try asking:</div>
            <div className="flex flex-wrap gap-2 justify-center">
              {getSmartSuggestions().slice(0, 3).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSuggestionClick(suggestion)}
                  className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/20 rounded-full text-xs text-white/70 hover:text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="pt-3 border-t border-blue-500/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/30">Wingman v2.0</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              <span className="text-white/30">
                {googleConnection.isConnected ? 'Drive + Calendar + Vision Ready' : 'Vision Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}