export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
  }
  
  export class OpenAIService {
    private apiKey: string
    private baseURL = 'https://api.openai.com/v1'
  
    constructor(apiKey: string) {
      this.apiKey = apiKey
    }
  
    async sendMessage(messages: ChatMessage[]): Promise<string> {
      try {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview', // or 'gpt-3.5-turbo' for faster/cheaper
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
  }
  
  // Singleton instance
  let openAIService: OpenAIService | null = null
  
  export function initializeOpenAI(apiKey: string) {
    openAIService = new OpenAIService(apiKey)
  }
  
  export function getOpenAI(): OpenAIService {
    if (!openAIService) {
      throw new Error('OpenAI service not initialized. Call initializeOpenAI first.')
    }
    return openAIService
  }
  