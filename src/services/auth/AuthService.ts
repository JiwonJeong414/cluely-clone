/**
 * Authentication Service
 * 
 * Handles user authentication with Google OAuth2, including sign-in, sign-out,
 * and session management. Manages Google API connections for Drive, Calendar,
 * and Documents access. Integrates with database for user persistence.
 */

import { shell } from 'electron'
import { google } from 'googleapis'
import * as crypto from 'crypto'
import { DatabaseService } from '../database/DatabaseService'
import type { User, GoogleConnection } from '../../types'

export class AuthService {
  private static instance: AuthService
  private oauth2Client: any
  private currentUser: User | null = null
  private googleConnection: GoogleConnection = { isConnected: false }
  private db: DatabaseService

  private constructor() {
    this.db = DatabaseService.getInstance()
    this.initializeOAuth()
  }

  /**
   * Get the singleton instance of AuthService
   * @returns AuthService - The singleton instance
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Initialize OAuth2 client with Google API credentials
   * Sets up the OAuth2 client with client ID, secret, and callback URL
   */
  private initializeOAuth() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:8080/oauth/callback' // Local callback server
    )
  }

  /**
   * Sign in user with Google OAuth2 authentication
   * Opens browser for Google authentication and handles OAuth callback
   * @returns Promise<User> - The authenticated user object
   * @throws {Error} If authentication fails or times out
   */
  async signInWithGoogle(): Promise<User> {
    return new Promise((resolve, reject) => {
      try {
        // Generate state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex')
        
        // Create OAuth URL with Drive and Calendar scopes
        const scopes = [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/documents' // Google Docs API scope
        ]

        const authUrl = this.oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: scopes,
          state,
          prompt: 'consent'
        })

        // Create a temporary server to handle the callback
        const callbackServer = require('http').createServer(async (req: any, res: any) => {
          try {
            const url = new URL(req.url, 'http://localhost:8080')
            const code = url.searchParams.get('code')
            const returnedState = url.searchParams.get('state')

            // Verify state
            if (returnedState !== state) {
              throw new Error('Invalid state parameter')
            }

            if (code) {
              // Exchange code for tokens
              const { tokens } = await this.oauth2Client.getToken(code)
              this.oauth2Client.setCredentials(tokens)

              // Get user info
              const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client })
              const { data: userInfo } = await oauth2.userinfo.get()

              if (!userInfo.email || !userInfo.id) {
                throw new Error('Failed to get user info')
              }

              // Store user in database
              const user = await this.db.upsertUser({
                uid: userInfo.id,
                email: userInfo.email,
                displayName: userInfo.name || '',
                photoURL: userInfo.picture || ''
              })

              // Store Google connection
              if (tokens.access_token) {
                await this.db.upsertGoogleConnection(user.id, {
                  accessToken: tokens.access_token,
                  refreshToken: tokens.refresh_token || undefined,
                  isConnected: true
                })

                this.googleConnection = {
                  isConnected: true,
                  accessToken: tokens.access_token,
                  refreshToken: tokens.refresh_token || undefined,
                  connectedAt: new Date()
                }
              }

              this.currentUser = user

              // Send success response and close
              res.writeHead(200, { 'Content-Type': 'text/html' })
              res.end(`
                <html>
                  <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h2>[✓] Authentication Successful!</h2>
                    <p>You can now close this window and return to Wingman.</p>
                    <script>setTimeout(() => window.close(), 2000)</script>
                  </body>
                </html>
              `)

              callbackServer.close()
              resolve(user)
            } else {
              throw new Error('No authorization code received')
            }
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end(`
              <html>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                  <h2>Authentication Failed</h2>
                  <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
                  <script>setTimeout(() => window.close(), 3000)</script>
                </body>
              </html>
            `)
            callbackServer.close()
            reject(error)
          }
        })

        // Start callback server
        callbackServer.listen(8080, () => {
          console.log('OAuth callback server listening on port 8080')
          
          // Open browser for authentication
          shell.openExternal(authUrl)
        })

        // Timeout after 5 minutes
        setTimeout(() => {
          callbackServer.close()
          reject(new Error('Authentication timeout'))
        }, 5 * 60 * 1000)

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Sign out the current user and clear authentication state
   * Clears current user, Google connection, and OAuth credentials
   */
  async signOut() {
    this.currentUser = null
    this.googleConnection = { isConnected: false }
    
    if (this.oauth2Client) {
      this.oauth2Client.setCredentials({})
    }
  }

  /**
   * Get the currently authenticated user
   * @returns User | null - The current user object or null if not authenticated
   */
  getCurrentUser(): User | null {
    return this.currentUser
  }

  /**
   * Get the current Google connection status and tokens
   * @returns GoogleConnection - The current Google connection information
   */
  getGoogleConnection(): GoogleConnection {
    return this.googleConnection
  }

  /**
   * Load user session from database on application startup
   * Restores user authentication state and Google connection from persistent storage
   */
  async loadUserFromStorage(): Promise<void> {
    // Load user from database on app startup
    // This would need to be implemented based on how you want to persist sessions
    try {
      const users = await this.db.getAllUsers()
      if (users.length > 0) {
        // For simplicity, use the most recent user
        const user = users[0]
        this.currentUser = user

        // Load Google connection
        const connection = await this.db.getGoogleConnection(user.id)
        if (connection) {
          this.googleConnection = {
            isConnected: connection.isConnected,
            accessToken: connection.accessToken,
            refreshToken: connection.refreshToken || undefined,
            connectedAt: connection.connectedAt,
            lastDriveSyncAt: connection.lastDriveSyncAt || undefined,
            lastCalendarSyncAt: connection.lastCalendarSyncAt || undefined
          }

          // Restore OAuth credentials
          if (connection.accessToken) {
            this.oauth2Client.setCredentials({
              access_token: connection.accessToken,
              refresh_token: connection.refreshToken
            })
          }
        }
      }
    } catch (error) {
      console.error('Error loading user from storage:', error)
    }
  }

  /**
   * Get the OAuth2 client for making authenticated API requests
   * @returns any - The configured OAuth2 client instance
   */
  getOAuthClient() {
    return this.oauth2Client
  }
}