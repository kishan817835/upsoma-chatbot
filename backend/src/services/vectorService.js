const { QdrantClient } = require('@qdrant/js-client-rest');

class VectorService {
  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'https://821266cd-5c75-487f-adbf-47ee9bf61f72.sa-east-1-0.aws.cloud.qdrant.io:6333',
      apiKey: process.env.QDRANT_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.oYFM6Ktlk6TennvuBimSoK1Puqm2f7afQmaaRvkOxpU'
    });
    
    this.collectionName = process.env.COLLECTION_NAME || 'embeddings';
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔄 Initializing Qdrant vector database...');
      
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!exists) {
        // Create collection
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 384, // Model dimensions
            distance: 'Cosine'
          }
        });
        console.log(`✅ Created collection: ${this.collectionName}`);
      } else {
        console.log(`✅ Collection already exists: ${this.collectionName}`);
      }
      
      this.isInitialized = true;
      console.log('✅ Qdrant vector database initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Qdrant:', error);
      throw error;
    }
  }

  async saveEmbedding(text, embedding, metadata = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const point = {
        id: this.generateId(),
        vector: embedding,
        payload: {
          text: text,
          timestamp: new Date().toISOString(),
          model: 'all-MiniLM-L6-v2',
          dimensions: 384,
          ...metadata
        }
      };

      await this.client.upsert(this.collectionName, {
        points: [point]
      });

      console.log(`💾 Saved embedding for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      return point.id;
      
    } catch (error) {
      console.error('❌ Failed to save embedding:', error);
      throw error;
    }
  }

  async saveBatchEmbeddings(texts, embeddings, metadata = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const points = texts.map((text, index) => ({
        id: this.generateId(),
        vector: embeddings[index],
        payload: {
          text: text,
          timestamp: new Date().toISOString(),
          model: 'all-MiniLM-L6-v2',
          dimensions: 384,
          index: index,
          ...metadata
        }
      }));

      await this.client.upsert(this.collectionName, {
        points: points
      });

      console.log(`💾 Saved ${points.length} batch embeddings`);
      return points.map(p => p.id);
      
    } catch (error) {
      console.error('❌ Failed to save batch embeddings:', error);
      throw error;
    }
  }

  async searchEmbeddings(queryEmbedding, limit = 10, scoreThreshold = 0.7) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit: limit,
        score_threshold: scoreThreshold,
        with_payload: true
      });

      const results = searchResult.map(result => ({
        id: result.id,
        score: result.score,
        text: result.payload.text,
        timestamp: result.payload.timestamp,
        model: result.payload.model,
        metadata: result.payload
      }));
      
      // Group results by company and document for better context
      const groupedResults = this.groupResultsByCompanyAndDocument(results);
      
      return {
        ...this.formatSearchResponse(results, queryEmbedding, limit, scoreThreshold),
        groupedResults: groupedResults
      };
      
    } catch (error) {
      console.error('❌ Failed to search embeddings:', error);
      throw error;
    }
  }

  groupResultsByCompanyAndDocument(results) {
    const grouped = {};
    
    results.forEach(result => {
      const companyName = result.metadata?.companyName || result.metadata?.organization_name || 'Unknown';
      const documentName = result.metadata?.documentName || result.metadata?.document_name || 'Unknown';
      const key = `${companyName}|${documentName}`;
      
      if (!grouped[key]) {
        grouped[key] = [];
      }
      
      grouped[key].push(result);
    });
    
    return grouped;
  }

  formatSearchResponse(results, queryEmbedding, limit, scoreThreshold) {
    return {
      object: 'list',
      data: results,
      query: 'search query', // This would be the actual query text
      model: 'all-MiniLM-L6-v2',
      results_count: results.length,
      search_params: {
        limit: limit,
        score_threshold: scoreThreshold
      },
      search_time: new Date().toISOString()
    };
  }

  async getCollectionInfo() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        name: this.collectionName,
        vectors_count: info.vectors_count,
        points_count: info.points_count,
        status: info.status,
        optimizer_status: info.optimizer_status
      };
    } catch (error) {
      console.error('❌ Failed to get collection info:', error);
      throw error;
    }
  }

  generateId() {
    // Generate UUID-like ID (simple version)
    return Math.floor(Math.random() * 1000000000);
  }

  async getStats() {
    try {
      const info = await this.getCollectionInfo();
      return {
        service: 'qdrant',
        collection: this.collectionName,
        vectors_count: info.vectors_count,
        points_count: info.points_count,
        is_initialized: this.isInitialized
      };
    } catch (error) {
      return {
        service: 'qdrant',
        collection: this.collectionName,
        vectors_count: 0,
        points_count: 0,
        is_initialized: false,
        error: error.message
      };
    }
  }
}

module.exports = { VectorService };
