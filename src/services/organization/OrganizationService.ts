// src/services/organization/OrganizationService.ts
import { DriveService } from '../drive/DriveService'
import { DatabaseService } from '../database/DatabaseService'

export interface FileWithEmbedding {
  fileId: string
  fileName: string
  embedding: number[]
  content?: string
  metadata?: any
  folderPath?: string
}

export interface FileCluster {
  id: string
  name: string
  description: string
  color: string
  suggestedFolderName: string
  category: 'work' | 'personal' | 'media' | 'documents' | 'archive' | 'mixed'
  files: Array<{
    fileId: string
    fileName: string
    confidence: number
    keywords: string[]
  }>
}

export interface OrganizationPlan {
  clusters: FileCluster[]
}

export interface OrganizationResult {
  clustersCreated: number
  foldersCreated: string[]
  filesMoved: number
  errors: string[]
}

export class OrganizationService {
  constructor(
    private driveService: DriveService,
    private dbService: DatabaseService
  ) {}

  async analyzeForOrganization(
    userId: string,
    options: {
      method?: 'folders' | 'clustering' | 'hybrid'
      maxClusters?: number
      minClusterSize?: number
    } = {}
  ): Promise<{ clusters: FileCluster[] }> {
    const {
      method = 'hybrid',
      maxClusters = 6,
      minClusterSize = 3
    } = options

    console.log(`🎯 Starting ${method} organization analysis for user ${userId}`)

    // Get files with embeddings
    const fileData = await this.getFileDataWithEmbeddings(userId)
    
    if (fileData.length < 10) {
      throw new Error(`Need at least 10 files for meaningful organization. Currently have ${fileData.length} files with embeddings.`)
    }

    console.log(`📊 Analyzing ${fileData.length} files for organization`)

    let clusters: FileCluster[] = []

    switch (method) {
      case 'folders':
        clusters = await this.organizeByExistingStructure(fileData)
        break
      case 'clustering':
        clusters = await this.organizeByKMeans(fileData, maxClusters, minClusterSize)
        break
      case 'hybrid':
        const folderClusters = await this.organizeByExistingStructure(fileData)
        const contentClusters = await this.organizeByKMeans(fileData, maxClusters - folderClusters.length, minClusterSize)
        clusters = [...folderClusters, ...contentClusters]
        break
    }

    console.log(`✅ Created ${clusters.length} organization clusters`)
    return { clusters }
  }

  async executeOrganization(userId: string, plan: OrganizationPlan): Promise<OrganizationResult> {
    const result: OrganizationResult = {
      clustersCreated: 0,
      foldersCreated: [],
      filesMoved: 0,
      errors: []
    }

    for (const cluster of plan.clusters) {
      try {
        // Create folder
        const folderName = cluster.suggestedFolderName || cluster.name
        console.log(`📁 Creating folder: ${folderName}`)
        const folderId = await this.driveService.createFolder(folderName)
        
        result.foldersCreated.push(folderName)

        // Move files to folder (using shortcuts to preserve originals)
        console.log(`📦 Moving ${cluster.files.length} files to ${folderName}`)
        for (const file of cluster.files) {
          try {
            await this.driveService.createShortcut(file.fileId, folderId, file.fileName)
            result.filesMoved++
            console.log(`   ✅ Moved ${file.fileName}`)
          } catch (error) {
            const errorMsg = `Failed to move ${file.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`
            result.errors.push(errorMsg)
            console.error(`   ❌ ${errorMsg}`)
          }
        }

        // Log organization activity
        await this.dbService.logOrganizationActivity(userId, {
          clusterName: cluster.name,
          folderName,
          filesMoved: cluster.files.length,
          method: 'electron-app',
          confidence: cluster.files.reduce((sum, f) => sum + f.confidence, 0) / cluster.files.length,
          metadata: {
            category: cluster.category,
            keywords: cluster.files.flatMap(f => f.keywords),
            folderId
          }
        })

        result.clustersCreated++
      } catch (error) {
        const errorMsg = `Failed to process cluster ${cluster.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        result.errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    return result
  }

  private async getFileDataWithEmbeddings(userId: string): Promise<FileWithEmbedding[]> {
    const embeddings = await this.dbService.getDocumentEmbeddings(userId)
    
    // Group by fileId and take first chunk for each file
    const fileMap = new Map<string, FileWithEmbedding>()
    
    embeddings.forEach(embedding => {
      if (!fileMap.has(embedding.fileId)) {
        fileMap.set(embedding.fileId, {
          fileId: embedding.fileId,
          fileName: embedding.fileName,
          embedding: embedding.embedding,
          content: embedding.content,
          metadata: embedding.metadata,
          folderPath: embedding.metadata?.folderPath || 'Root'
        })
      }
    })

    const result = Array.from(fileMap.values())
    console.log(`✅ Found ${result.length} unique files with embeddings`)
    return result
  }

  private async organizeByKMeans(
    fileData: FileWithEmbedding[],
    k: number,
    minClusterSize: number
  ): Promise<FileCluster[]> {
    console.log(`🧮 Running K-means clustering with k=${k}`)

    // Extract embeddings for clustering
    const embeddings = fileData.map(f => f.embedding)
    const clusters = this.kMeansClustering(embeddings, k)

    // Group files by cluster
    const fileClusters: FileCluster[] = []
    
    for (let i = 0; i < k; i++) {
      const clusterFiles = fileData
        .map((file, idx) => ({ file, cluster: clusters[idx] }))
        .filter(item => item.cluster === i)
        .map(item => item.file)

      if (clusterFiles.length < minClusterSize) {
        console.log(`⚠️ Cluster ${i} too small (${clusterFiles.length} files), merging with others`)
        continue
      }

      // Analyze cluster content to determine theme
      const theme = this.analyzeClusterTheme(clusterFiles)
      
      fileClusters.push({
        id: `cluster_${i}`,
        name: theme.name,
        description: theme.description,
        color: this.getClusterColor(i),
        suggestedFolderName: theme.folderName,
        category: theme.category,
        files: clusterFiles.map(f => ({
          fileId: f.fileId,
          fileName: f.fileName,
          confidence: 0.8, // K-means confidence
          keywords: theme.keywords
        }))
      })
    }

    console.log(`✅ Created ${fileClusters.length} content-based clusters`)
    return fileClusters
  }

  private async organizeByExistingStructure(fileData: FileWithEmbedding[]): Promise<FileCluster[]> {
    console.log(`📁 Analyzing existing folder structure`)

    // Group files by their current folder structure
    const folderGroups = new Map<string, FileWithEmbedding[]>()
    
    for (const file of fileData) {
      const folderPath = file.folderPath || 'Root'
      if (!folderGroups.has(folderPath)) {
        folderGroups.set(folderPath, [])
      }
      folderGroups.get(folderPath)!.push(file)
    }

    const clusters: FileCluster[] = []
    let clusterIndex = 0

    for (const [folderPath, files] of folderGroups) {
      if (files.length < 2) continue // Skip single files

      const theme = this.analyzeClusterTheme(files)
      
      clusters.push({
        id: `folder_${clusterIndex++}`,
        name: `${folderPath} Organization`,
        description: `Files from ${folderPath} folder`,
        color: this.getClusterColor(clusterIndex),
        suggestedFolderName: this.improveFolderName(folderPath, theme),
        category: theme.category,
        files: files.map(f => ({
          fileId: f.fileId,
          fileName: f.fileName,
          confidence: 0.9, // High confidence for existing structure
          keywords: theme.keywords
        }))
      })
    }

    console.log(`✅ Created ${clusters.length} folder-based clusters`)
    return clusters
  }

  private kMeansClustering(embeddings: number[][], k: number): number[] {
    const numPoints = embeddings.length
    const dimensions = embeddings[0].length
    
    // Initialize centroids randomly
    let centroids: number[][] = []
    for (let i = 0; i < k; i++) {
      const centroid = new Array(dimensions)
      for (let j = 0; j < dimensions; j++) {
        centroid[j] = Math.random() * 2 - 1
      }
      centroids.push(centroid)
    }

    let assignments = new Array(numPoints).fill(0)
    let hasChanged = true
    let iterations = 0
    const maxIterations = 100

    while (hasChanged && iterations < maxIterations) {
      hasChanged = false
      iterations++

      // Assign each point to nearest centroid
      for (let i = 0; i < numPoints; i++) {
        let minDistance = Infinity
        let bestCluster = 0

        for (let j = 0; j < k; j++) {
          const distance = this.euclideanDistance(embeddings[i], centroids[j])
          if (distance < minDistance) {
            minDistance = distance
            bestCluster = j
          }
        }

        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster
          hasChanged = true
        }
      }

      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterPoints = embeddings.filter((_, idx) => assignments[idx] === j)
        
        if (clusterPoints.length > 0) {
          for (let dim = 0; dim < dimensions; dim++) {
            centroids[j][dim] = clusterPoints.reduce((sum, point) => sum + point[dim], 0) / clusterPoints.length
          }
        }
      }
    }

    console.log(`🔄 K-means converged after ${iterations} iterations`)
    return assignments
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0))
  }

  private analyzeClusterTheme(files: FileWithEmbedding[]): {
    name: string
    description: string
    folderName: string
    category: FileCluster['category']
    keywords: string[]
  } {
    const fileNames = files.map(f => f.fileName.toLowerCase())
    const allText = files.map(f => f.content?.substring(0, 200) || '').join(' ').toLowerCase()

    // Category detection
    const categoryScores = {
      work: 0,
      personal: 0,
      media: 0,
      documents: 0,
      archive: 0,
      mixed: 0
    }

    const patterns = {
      work: ['meeting', 'report', 'presentation', 'budget', 'project', 'proposal', 'work', 'business', 'company'],
      personal: ['photo', 'vacation', 'family', 'personal', 'diary', 'journal', 'home', 'life'],
      media: ['image', 'video', 'audio', 'photo', '.jpg', '.png', '.mp4', 'media', 'picture'],
      documents: ['document', 'pdf', 'doc', 'text', 'notes', 'manual', 'paper', 'report'],
      archive: ['old', 'backup', 'archive', '2020', '2021', '2022', 'previous']
    }

    for (const [category, keywords] of Object.entries(patterns)) {
      keywords.forEach(keyword => {
        if (allText.includes(keyword)) {
          categoryScores[category as keyof typeof categoryScores] += 1
        }
        if (fileNames.some(name => name.includes(keyword))) {
          categoryScores[category as keyof typeof categoryScores] += 2
        }
      })
    }

    let bestCategory: FileCluster['category'] = 'mixed'
    let maxScore = 0

    for (const [category, score] of Object.entries(categoryScores)) {
      if (score > maxScore) {
        maxScore = score
        bestCategory = category as FileCluster['category']
      }
    }

    // Extract meaningful words
    const commonWords = this.extractCommonWords(fileNames)
    const meaningfulWords = commonWords.filter(word => 
      word.length > 3 && !['file', 'doc', 'pdf', 'txt'].includes(word)
    )

    let themeName: string
    let folderName: string

    if (meaningfulWords.length > 0) {
      const primaryWord = meaningfulWords[0]
      themeName = `${this.capitalizeWords(primaryWord)} Collection`
      folderName = this.capitalizeWords(primaryWord)
    } else {
      themeName = `${this.capitalizeWords(bestCategory)} Files`
      folderName = this.capitalizeWords(bestCategory)
    }

    return {
      name: themeName,
      description: `Collection of ${bestCategory} files`,
      folderName,
      category: bestCategory,
      keywords: meaningfulWords
    }
  }

  private extractCommonWords(fileNames: string[]): string[] {
    const wordCount = new Map<string, number>()
    
    fileNames.forEach(name => {
      const words = name.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['file', 'document', 'untitled'].includes(word))
      
      words.forEach(word => {
        wordCount.set(word, (wordCount.get(word) || 0) + 1)
      })
    })

    return Array.from(wordCount.entries())
      .filter(([word, count]) => count >= Math.max(2, fileNames.length * 0.3))
      .sort(([, a], [, b]) => b - a)
      .map(([word]) => word)
      .slice(0, 3)
  }

  private capitalizeWords(str: string): string {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  private getClusterColor(index: number): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
      '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'
    ]
    return colors[index % colors.length]
  }

  private improveFolderName(currentPath: string, theme: any): string {
    if (currentPath === 'Root') return theme.folderName
    
    const pathParts = currentPath.split('/').filter(Boolean)
    const lastPart = pathParts[pathParts.length - 1]
    
    return `${lastPart} - Organized`
  }
}