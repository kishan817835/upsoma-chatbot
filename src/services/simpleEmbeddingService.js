const { pipeline } = require('@xenova/transformers');

class SimpleEmbeddingService {
  constructor() {
    this.modelName = process.env.MODEL_NAME || 'Xenova/all-MiniLM-L6-v2';
    this.dimensions = parseInt(process.env.MODEL_DIMENSIONS) || 384;
    this.pipeline = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log(`🔄 Loading model: ${this.modelName}...`);
    
    try {
      this.pipeline = await pipeline('feature-extraction', this.modelName);
      this.isInitialized = true;
      console.log(`✅ Model ${this.modelName} loaded successfully`);
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!Array.isArray(texts)) {
      texts = [texts];
    }

    if (texts.length === 0) {
      throw new Error('No texts provided for embedding generation');
    }

    // Validate inputs
    texts.forEach((text, index) => {
      if (typeof text !== 'string' || text.trim().length === 0) {
        throw new Error(`Invalid text at index ${index}: must be non-empty string`);
      }
    });

    console.log(`🔄 Processing ${texts.length} texts...`);
    
    try {
      // Process all texts in parallel
      const promises = texts.map(async (text, index) => {
        const result = await this.pipeline(text, {
          pooling: 'mean',
          normalize: true
        });
        
        return {
          object: 'embedding',
          embedding: Array.from(result.data),
          index: index
        };
      });

      const embeddings = await Promise.all(promises);
      
      console.log(`✅ Generated ${embeddings.length} embeddings`);
      return embeddings;
      
    } catch (error) {
      console.error('❌ Error generating embeddings:', error);
      throw error;
    }
  }

  getStats() {
    return {
      service: {
        isInitialized: this.isInitialized,
        modelName: this.modelName,
        dimensions: 384
      }
    };
  }
}

module.exports = { SimpleEmbeddingService };
