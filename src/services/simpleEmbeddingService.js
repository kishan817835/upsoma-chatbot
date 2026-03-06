const crypto = require('crypto');

class SimpleEmbeddingService {
  constructor() {
    this.modelName = process.env.MODEL_NAME || 'all-MiniLM-L6-v2';
    this.dimensions = parseInt(process.env.MODEL_DIMENSIONS) || 384;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log(`🔄 Loading model: ${this.modelName}...`);
    
    this.isInitialized = true;
    console.log(`✅ Model ${this.modelName} loaded successfully`);
  }

  async generateEmbeddings(texts) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!Array.isArray(texts)) {
      texts = [texts];
    }

    texts.forEach((text, index) => {
      if (typeof text !== 'string' || text.trim().length === 0) {
        throw new Error(`Invalid text at index ${index}: must be non-empty string`);
      }
    });

    try {
      const embeddings = [];
      
      for (const text of texts) {
        const embedding = await this.generateSimpleEmbedding(text);
        embeddings.push({
          object: 'embedding',
          embedding: embedding,
          index: embeddings.length
        });
      }
      
      return embeddings;
    } catch (error) {
      console.error('❌ Error generating embeddings:', error);
      throw error;
    }
  }

  async generateSimpleEmbedding(text) {
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    const embedding = new Array(this.dimensions).fill(0);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = this.hashWord(word);
      
      for (let j = 0; j < this.dimensions; j++) {
        embedding[j] += (hash * (i + 1)) / (j + 1);
      }
    }
    
    // Normalize the embedding
    let magnitude = 0;
    for (let j = 0; j < this.dimensions; j++) {
      magnitude += embedding[j] * embedding[j];
    }
    magnitude = Math.sqrt(magnitude);
    
    if (magnitude > 0) {
      for (let j = 0; j < this.dimensions; j++) {
        embedding[j] = embedding[j] / magnitude;
      }
    }
    
    return embedding;
  }

  hashWord(word) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      const char = word.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 1000;
  }

  async generateEmbedding(text) {
    const embeddings = await this.generateEmbeddings([text]);
    return embeddings[0];
  }
}

module.exports = { SimpleEmbeddingService };
