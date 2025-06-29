import { useState, useEffect } from 'react'
import type { User, GoogleConnection } from '../types/app'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [googleConnection, setGoogleConnection] = useState<GoogleConnection>({ isConnected: false })
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Loads user data and Google connection status on startup
  useEffect(() => {
    const loadUserData = async () => {
      if (window.electronAPI?.auth) {
        try {
          const userData = await window.electronAPI.auth.getUser()
          if (userData) {
            setUser(userData)
            
            const connection = await window.electronAPI.auth.getGoogleConnection()
            setGoogleConnection(connection)
          }
        } catch (error) {
          console.error('Error loading user data:', error)
        }
      }
    }

    loadUserData()
  }, [])

  // Handles user sign in process
  const handleSignIn = async () => {
    if (!window.electronAPI?.auth) return
    
    setIsAuthenticating(true)
    try {
      const result = await window.electronAPI.auth.signIn()
      if (result.success && result.user) {
        setUser(result.user)
        
        const connection = await window.electronAPI.auth.getGoogleConnection()
        setGoogleConnection(connection)
      } else {
        console.error('Sign in failed:', result.error)
      }
    } catch (error) {
      console.error('Error signing in:', error)
    } finally {
      setIsAuthenticating(false)
    }
  }

  // Handles user sign out process
  const handleSignOut = async () => {
    if (!window.electronAPI?.auth) return
    
    try {
      await window.electronAPI.auth.signOut()
      setUser(null)
      setGoogleConnection({ isConnected: false })
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return {
    user,
    googleConnection,
    isAuthenticating,
    handleSignIn,
    handleSignOut
  }
}