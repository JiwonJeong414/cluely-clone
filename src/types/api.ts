/**
 * OpenAI API related type definitions
 */

/**
 * Represents a chat message with role and content
 * Content can be either a string or an array of text/image content
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

/**
 * Represents a vision message specifically for image analysis
 * Content must be an array of text/image content
 */
export interface VisionMessage {
  role: 'user' | 'assistant' | 'system'
  content: Array<{
    type: 'text' | 'image_url'
    text?: string
    image_url?: {
      url: string
      detail?: 'low' | 'high' | 'auto'
    }
  }>
} 