/**
 * OpenAI API related type definitions
 */

/**
 * Represents a chat message with role and content
 *
 * NOTE: This type is used for communicating with the OpenAI API (and similar LLM APIs).
 * It supports multimodal content (text and images) and matches the API's expected format.
 *
 * This is DIFFERENT from Message in src/types/app.ts, which is used for the application's
 * UI and chat history, and includes additional metadata for frontend rendering.
 * Do not confuse or interchange these types—they serve different purposes.
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{
    type: 'text' | 'image_url'
    text?: string
    image_url?: {
      url: string
      detail?: 'low' | 'high' | 'auto'
    }
  }>
} 