// src/services/auth/AuthService.ts
import { shell } from 'electron'
import { google } from 'googleapis'
import * as crypto from 'crypto'
import { DatabaseService } from '../database/DatabaseService'

export interface User {
  id: string
  uid: string
  email: string
  displayName: string
  photoURL?: string
}

export interface GoogleConnection {
  isConnected: boolean
  accessToken?: string
  refreshToken?: string
  connectedAt?: Date
  lastDriveSyncAt?: Date
  lastCalendarSyncAt?: Date
}

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

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  private initializeOAuth() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:8080/oauth/callback' // Local callback server
    )
  }

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
                    <h2>✅ Authentication Successful!</h2>
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
                  <h2>❌ Authentication Failed</h2>
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

  async signOut() {
    this.currentUser = null
    this.googleConnection = { isConnected: false }
    
    if (this.oauth2Client) {
      this.oauth2Client.setCredentials({})
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser
  }

  getGoogleConnection(): GoogleConnection {
    return this.googleConnection
  }

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

  getOAuthClient() {
    return this.oauth2Client
  }
}