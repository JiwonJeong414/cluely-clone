import { ChatMessage, VisionMessage } from '../types'

/**
 * OpenAI API Service
 * 
 * This service handles all communication with OpenAI's API, including:
 * - Regular chat completions
 * - Vision-enabled chat (image analysis)
 * - Streaming responses
 * - Screenshot analysis
 */
export class OpenAIService {
  private apiKey: string
  private baseURL = 'https://api.openai.com/v1'

  /**
   * Creates a new OpenAI service instance
   * @param apiKey - Your OpenAI API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Sends a regular chat message to OpenAI and returns the response
   * @param messages - Array of chat messages to send
   * @returns Promise<string> - The AI assistant's response
   * @throws Error if the API request fails
   */
  async sendMessage(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || 'No response received'
    } catch (error) {
      console.error('OpenAI API Error:', error)
      throw new Error('Failed to get response from AI assistant')
    }
  }

  /**
   * Sends a vision-enabled message to OpenAI for image analysis
   * @param messages - Array of chat messages (can include images)
   * @returns Promise<string> - The AI assistant's analysis
   * @throws Error if the API request fails
   */
  async sendMessageWithVision(messages: ChatMessage[]): Promise<string> {
    try {
      console.log('Sending vision request to OpenAI...')
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Updated to use gpt-4o which has better vision capabilities
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI API Error Response:', errorText)
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('OpenAI Vision API Response:', data)
      return data.choices[0]?.message?.content || 'No response received'
    } catch (error) {
      console.error('OpenAI Vision API Error:', error)
      throw new Error('Failed to get response from AI vision assistant')
    }
  }

  /**
   * Sends a streaming chat message to OpenAI
   * @param messages - Array of chat messages to send
   * @param onChunk - Callback function called for each chunk of the response
   * @returns Promise<void>
   * @throws Error if the streaming request fails
   */
  async sendMessageStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6)
            if (data === '[DONE]') return

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices[0]?.delta?.content
              if (content) {
                onChunk(content)
              }
            } catch (e) {
              // Ignore parsing errors for non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenAI Streaming Error:', error)
      throw new Error('Failed to stream response from AI assistant')
    }
  }

  /**
   * Sends a streaming vision-enabled message to OpenAI
   * @param messages - Array of chat messages (can include images)
   * @param onChunk - Callback function called for each chunk of the response
   * @returns Promise<void>
   * @throws Error if the streaming request fails
   */
  async sendMessageWithVisionStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<void> {
    try {
      console.log('Starting vision stream to OpenAI...')
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Updated to use gpt-4o
          messages: messages,
          max_tokens: 1000,
          temperature: 0.7,
          stream: true
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI Streaming API Error Response:', errorText)
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6)
            if (data === '[DONE]') return

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices[0]?.delta?.content
              if (content) {
                console.log('Streaming chunk:', content)
                onChunk(content)
              }
            } catch (e) {
              // Ignore parsing errors for non-JSON lines
            }
          }
        }
      }
    } catch (error) {
      console.error('OpenAI Vision Streaming Error:', error)
      throw new Error('Failed to stream response from AI vision assistant')
    }
  }

  /**
   * Creates a vision message with screenshot for image analysis
   * @param text - The text prompt/question about the image
   * @param screenshotDataUrl - Base64 encoded image data URL
   * @returns ChatMessage - Formatted message ready for vision API
   */
  createVisionMessage(text: string, screenshotDataUrl: string): ChatMessage {
    return {
      role: 'user',
      content: [
        {
          type: 'text',
          text: text
        },
        {
          type: 'image_url',
          image_url: {
            url: screenshotDataUrl,
            detail: 'high' // Use high detail for better analysis
          }
        }
      ]
    }
  }

  /**
   * Analyzes a screenshot with optional user question
   * @param screenshotDataUrl - Base64 encoded image data URL
   * @param userQuestion - Optional specific question about the screenshot
   * @returns Promise<string> - AI analysis of the screenshot
   */
  async analyzeScreenshot(screenshotDataUrl: string, userQuestion?: string): Promise<string> {
    const question = userQuestion || "What do you see on this screen? Describe what's happening and provide any relevant insights."
    
    const visionMessage = this.createVisionMessage(question, screenshotDataUrl)
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are Wingman, an AI assistant that can see and analyze screenshots. Provide helpful, concise analysis of what you observe on the screen. Focus on relevant details and actionable insights.'
      },
      visionMessage
    ]

    return this.sendMessageWithVision(messages)
  }

  /**
   * Streams analysis of a screenshot with optional user question
   * @param screenshotDataUrl - Base64 encoded image data URL
   * @param onChunk - Callback function called for each chunk of the analysis
   * @param userQuestion - Optional specific question about the screenshot
   * @returns Promise<void>
   */
  async analyzeScreenshotStream(
    screenshotDataUrl: string, 
    onChunk: (chunk: string) => void,
    userQuestion?: string
  ): Promise<void> {
    const question = userQuestion || "What do you see on this screen? Describe what's happening and provide any relevant insights."
    
    const visionMessage = this.createVisionMessage(question, screenshotDataUrl)
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are Wingman, an AI assistant that can see and analyze screenshots. Provide helpful, concise analysis of what you observe on the screen. Focus on relevant details and actionable insights.'
      },
      visionMessage
    ]

    return this.sendMessageWithVisionStream(messages, onChunk)
  }
}

/**
 * Singleton instance of the OpenAI service
 */
let openAIService: OpenAIService | null = null

/**
 * Initializes the OpenAI service with the provided API key
 * @param apiKey - Your OpenAI API key
 */
export function initializeOpenAI(apiKey: string) {
  openAIService = new OpenAIService(apiKey)
}

/**
 * Gets the initialized OpenAI service instance
 * @returns OpenAIService - The singleton service instance
 * @throws Error if the service hasn't been initialized
 */
export function getOpenAI(): OpenAIService {
  if (!openAIService) {
    throw new Error('OpenAI service not initialized. Call initializeOpenAI first.')
  }
  return openAIService
}