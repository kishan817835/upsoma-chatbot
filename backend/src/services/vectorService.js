const { MilvusClient } = require('@zilliz/milvus2-sdk-node');

class VectorService {
  constructor() {
    this.client = new MilvusClient({
      address: process.env.ZILLIZ_URI || 'https://in03-543b566130651bd.serverless.aws-eu-central-1.cloud.zilliz.com',
      token: process.env.ZILLIZ_TOKEN || '6088aa07c2e1da722f96347113808c0ae465e2c54e84b4d7d833b5b301384cb91a808bf391c5bce36c3d2904985fe04374dbe886'
    });
    
    this.collectionName = process.env.COLLECTION_NAME || 'embeddings';
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔄 Initializing Zilliz vector database...');
      
      // Check if collection exists
      const collections = await this.client.listCollections();
      const exists = collections.collection_names.includes(this.collectionName);
      
      if (!exists) {
        // Create collection with schema for Zilliz
        await this.client.createCollection({
          collection_name: this.collectionName,
          fields: [
            {
              name: 'id',
              data_type: 'Int64',
              is_primary_key: true
            },
            {
              name: 'vector',
              data_type: 'FloatVector',
              dim: 384
            },
            {
              name: 'text',
              data_type: 'VarChar',
              max_length: 65535
            },
            {
              name: 'timestamp',
              data_type: 'VarChar',
              max_length: 255
            },
            {
              name: 'model',
              data_type: 'VarChar',
              max_length: 255
            },
            {
              name: 'dimensions',
              data_type: 'Int64'
            }
          ]
        });

        // Create index for vector field
        await this.client.createIndex({
          collection_name: this.collectionName,
          field_name: 'vector',
          index_type: 'FLAT',
          metric_type: 'COSINE'
        });

        // Load collection
        await this.client.loadCollection({
          collection_name: this.collectionName
        });

        console.log(`✅ Created collection: ${this.collectionName}`);
      } else {
        console.log(`✅ Collection already exists: ${this.collectionName}`);
        
        // Load the existing collection to make it ready for operations
        await this.client.loadCollection({
          collection_name: this.collectionName
        });
      }
      
      this.isInitialized = true;
      console.log('✅ Zilliz vector database initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Zilliz:', error);
      throw error;
    }
  }

  async saveEmbedding(text, embedding, metadata = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Prepare data for Zilliz insert - only include fields that exist in schema
      const data = [{
        id: this.generateId(),
        vector: embedding,
        text: text,
        timestamp: new Date().toISOString(),
        model: 'all-MiniLM-L6-v2',
        dimensions: 384
      }];

      const result = await this.client.insert({
        collection_name: this.collectionName,
        data: data
      });

      console.log(`💾 Saved embedding for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      return result.IDs ? result.IDs[0] : data[0].id; // Return the ID
      
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
      // Prepare data for Zilliz insert - only include fields that exist in schema
      const data = texts.map((text, index) => ({
        id: this.generateId(),
        vector: embeddings[index],
        text: text,
        timestamp: new Date().toISOString(),
        model: 'all-MiniLM-L6-v2',
        dimensions: 384
      }));

      const result = await this.client.insert({
        collection_name: this.collectionName,
        data: data
      });

      console.log(`💾 Saved ${data.length} batch embeddings`);
      return result.IDs || data.map(d => d.id); // Return the IDs
      
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
      const searchResult = await this.client.search({
        collection_name: this.collectionName,
        vectors: [queryEmbedding],
        search_params: {
          anns_field: 'vector',
          topk: limit,
          metric_type: 'COSINE',
          params: JSON.stringify({ nprobe: 10 })
        },
        output_fields: ['text', 'timestamp', 'model', 'dimensions']
      });

      const results = searchResult.results.map(result => ({
        id: result.id,
        score: result.score,
        text: result.entity?.text || result.text || 'No text available',
        timestamp: result.entity?.timestamp || result.timestamp || '',
        model: result.entity?.model || result.model || '',
        metadata: result.entity || result
      })).filter(result => result.score >= scoreThreshold);
      
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
      const info = await this.client.describeCollection({
        collection_name: this.collectionName
      });

      // Get collection statistics using the correct API
      const stats = await this.client.getCollectionStatistics({
        collection_name: this.collectionName
      });

      return {
        name: this.collectionName,
        vectors_count: parseInt(stats.data?.row_count?.toString() || '0') || 0,
        points_count: parseInt(stats.data?.row_count?.toString() || '0') || 0,
        status: info.status?.state || 'loaded',
        schema: info.schema
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
      // Try to get actual count from search instead of stats
      let count = 0;
      try {
        // Use the same search approach as searchEmbeddings
        const dummyEmbedding = new Array(384).fill(0.1); // Use 0.1 instead of 0
        const searchResult = await this.client.search({
          collection_name: this.collectionName,
          vectors: [dummyEmbedding],
          search_params: {
            anns_field: 'vector',
            topk: 1000, // Get up to 1000 results
            metric_type: 'COSINE',
            params: JSON.stringify({ nprobe: 10 })
          },
          output_fields: ['text', 'timestamp', 'model', 'dimensions']
        });
        count = searchResult.results?.length || 0;
      } catch (searchError) {
        console.log('Search count failed, using fallback:', searchError.message);
        // Fallback to stats if search fails
        const info = await this.getCollectionInfo();
        count = info.vectors_count;
      }
      
      return {
        service: 'zilliz',
        collection: this.collectionName,
        vectors_count: count,
        points_count: count, // Same for Zilliz
        is_initialized: this.isInitialized
      };
    } catch (error) {
      return {
        service: 'zilliz',
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
