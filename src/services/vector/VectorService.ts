/**
 * Vector Service
 * 
 * Handles document embeddings and vector similarity search using Ollama.
 * Provides functionality for creating embeddings, storing document chunks,
 * and performing semantic search across indexed documents.
 */

import { DatabaseService } from '../database/DatabaseService'
import type { SearchResult } from '../../types'

export class VectorService {
  private static instance: VectorService
  private db: DatabaseService
  private ollamaEndpoint: string

  private constructor() {
    this.db = DatabaseService.getInstance()
    this.ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'
  }

  /**
   * Get the singleton instance of VectorService
   * @returns VectorService - The singleton instance
   */
  static getInstance(): VectorService {
    if (!VectorService.instance) {
      VectorService.instance = new VectorService()
    }
    return VectorService.instance
  }

  /**
   * Check if the required embedding model is available in Ollama
   * @returns Promise<boolean> - True if embedding model is available
   */
  async checkEmbeddingModel(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/tags`)
      if (!response.ok) return false
      
      const data = await response.json() as { models?: Array<{ name: string }> }
      const models = data.models || []
      
      // Check if embedding model is available
      return models.some((model: any) => 
        model.name.includes('mxbai-embed-large') || 
        model.name.includes('nomic-embed-text')
      )
    } catch (error) {
      console.error('Error checking embedding model:', error)
      return false
    }
  }

  /**
   * Create an embedding vector for a given text using Ollama
   * @param text - Text to create embedding for
   * @returns Promise<number[]> - Embedding vector
   * @throws {Error} If embedding creation fails
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mxbai-embed-large', // or 'nomic-embed-text'
          prompt: text.substring(0, 8000) // Limit text length
        })
      })

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`)
      }

      const data = await response.json() as { embedding?: number[] }
      return data.embedding || []
    } catch (error) {
      console.error('Error creating embedding:', error)
      throw error
    }
  }

  /**
   * Store document embeddings by splitting content into chunks and creating embeddings
   * @param userId - The user's database ID
   * @param fileId - The file ID to store embeddings for
   * @param fileName - The name of the file
   * @param content - The file content to process
   * @returns Promise<void>
   * @throws {Error} If embedding storage fails
   */
  async storeDocumentEmbeddings(
    userId: string,
    fileId: string,
    fileName: string,
    content: string
  ): Promise<void> {
    try {
      // Clean and prepare content
      const cleanContent = this.preprocessText(content)
      
      // Split into chunks if content is very long
      const chunks = this.splitIntoChunks(cleanContent, 2000) // 2000 char chunks
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        
        // Create embedding for this chunk
        const embedding = await this.createEmbedding(chunk)
        
        if (embedding.length > 0) {
          // Store in database
          await this.db.storeDocumentEmbedding({
            fileId,
            fileName,
            content: chunk,
            embedding,
            metadata: {
              chunkTotal: chunks.length,
              chunkIndex: i,
              originalLength: content.length,
              processedAt: new Date().toISOString()
            },
            chunkIndex: i,
            userId
          })
          
          console.log(`[✓] Stored embedding for ${fileName} chunk ${i + 1}/${chunks.length}`)
        }
      }
    } catch (error) {
      console.error(`Error storing embeddings for ${fileName}:`, error)
      throw error
    }
  }

  /**
   * Search for similar documents using vector similarity
   * @param userId - The user's database ID
   * @param query - Search query string
   * @param limit - Maximum number of results to return (default: 5)
   * @returns Promise<SearchResult[]> - Array of similar documents with relevance scores
   * @throws {Error} If search fails
   */
  async searchSimilarDocuments(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      // Create embedding for the query
      const queryEmbedding = await this.createEmbedding(query)
      
      if (queryEmbedding.length === 0) {
        throw new Error('Failed to create query embedding')
      }

      // Search similar embeddings in database
      const results = await this.db.searchEmbeddings(userId, queryEmbedding, limit * 2)
      
      // Group by fileId and take best chunk per file
      const fileResults = new Map<string, SearchResult>()
      
      for (const result of results) {
        const existing = fileResults.get(result.fileId)
        
        if (!existing || result.similarity > existing.similarity) {
          fileResults.set(result.fileId, {
            fileId: result.fileId,
            fileName: result.fileName,
            content: result.content,
            similarity: result.similarity,
            metadata: result.metadata
          })
        }
      }

      return Array.from(fileResults.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
    } catch (error) {
      console.error('Error searching documents:', error)
      throw error
    }
  }

  /**
   * Preprocess text by cleaning whitespace and normalizing formatting
   * @param text - Raw text to preprocess
   * @returns string - Cleaned and normalized text
   */
  private preprocessText(text: string): string {
    // Remove excessive whitespace and normalize
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()
  }

  /**
   * Split text into chunks for embedding processing
   * @param text - Text to split into chunks
   * @param maxChunkSize - Maximum size of each chunk in characters
   * @returns string[] - Array of text chunks
   */
  private splitIntoChunks(text: string, maxChunkSize: number): string[] {
    if (text.length <= maxChunkSize) {
      return [text]
    }

    const chunks: string[] = []
    const sentences = text.split(/[.!?]+/)
    let currentChunk = ''

    for (const sentence of sentences) {
      const potentialChunk = currentChunk + sentence + '.'
      
      if (potentialChunk.length <= maxChunkSize) {
        currentChunk = potentialChunk
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = sentence + '.'
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }

    return chunks.filter(chunk => chunk.length > 50) // Filter out very short chunks
  }

  /**
   * Get information about files that have been indexed for a user
   * @param userId - The user's database ID
   * @returns Promise<any[]> - Array of indexed file information
   */
  async getUserIndexedFiles(userId: string) {
    const embeddings = await this.db.getDocumentEmbeddings(userId)
    
    // Group by fileId to get unique files
    const fileMap = new Map()
    embeddings.forEach(embedding => {
      if (!fileMap.has(embedding.fileId)) {
        fileMap.set(embedding.fileId, {
          fileId: embedding.fileId,
          fileName: embedding.fileName,
          chunkCount: 1,
          totalContent: embedding.content.length,
          lastUpdated: embedding.metadata?.processedAt || new Date().toISOString()
        })
      } else {
        const existing = fileMap.get(embedding.fileId)
        existing.chunkCount++
        existing.totalContent += embedding.content.length
      }
    })

    return Array.from(fileMap.values())
  }
}