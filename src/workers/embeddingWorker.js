const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { pipeline } = require('@xenova/transformers');

class EmbeddingWorker {
  constructor(workerId) {
    this.id = workerId;
    this.pipeline = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2';
    this.isInitialized = false;
    this.isProcessing = false;
    this.stats = {
      totalProcessed: 0,
      totalBatches: 0,
      avgProcessingTime: 0
    };
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log(`🤖 Worker ${this.id}: Loading model ${this.modelName}...`);
    
    try {
      this.pipeline = await pipeline('feature-extraction', this.modelName);
      this.isInitialized = true;
      console.log(`✅ Worker ${this.id}: Model loaded successfully`);
      
      parentPort.postMessage({
        type: 'worker_ready',
        workerId: this.id
      });
      
    } catch (error) {
      console.error(`❌ Worker ${this.id}: Failed to load model:`, error);
      parentPort.postMessage({
        type: 'worker_error',
        workerId: this.id,
        error: error.message
      });
    }
  }

  async processBatch(texts) {
    if (!this.isInitialized) {
      throw new Error(`Worker ${this.id} not initialized`);
    }

    if (this.isProcessing) {
      throw new Error(`Worker ${this.id} is busy`);
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      console.log(`🔄 Worker ${this.id}: Processing batch of ${texts.length} texts`);
      
      // Process all texts in parallel
      const promises = texts.map(async (text, index) => {
        const result = await this.pipeline(text, {
          pooling: 'mean',
          normalize: true
        });
        
        return Array.from(result.data);
      });

      const embeddings = await Promise.all(promises);
      const processingTime = Date.now() - startTime;
      
      // Update statistics
      this.updateStats(texts.length, processingTime);
      
      console.log(`✅ Worker ${this.id}: Completed ${texts.length} embeddings in ${processingTime}ms`);
      
      return embeddings;
      
    } catch (error) {
      console.error(`❌ Worker ${this.id}: Processing failed:`, error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  updateStats(batchSize, processingTime) {
    this.stats.totalProcessed += batchSize;
    this.stats.totalBatches++;
    this.stats.avgProcessingTime = (this.stats.avgProcessingTime * (this.stats.totalBatches - 1) + processingTime) / this.stats.totalBatches;
  }

  getStats() {
    return {
      ...this.stats,
      workerId: this.id,
      isInitialized: this.isInitialized,
      isProcessing: this.isProcessing,
      modelName: this.modelName
    };
  }

  async cleanup() {
    if (this.pipeline) {
      // Cleanup pipeline if needed
      this.pipeline = null;
    }
    this.isInitialized = false;
  }
}

// Worker thread execution
if (!isMainThread) {
  const worker = new EmbeddingWorker(workerData.workerId);
  
  // Initialize the worker
  worker.initialize();
  
  // Handle messages from main thread
  parentPort.on('message', async (message) => {
    try {
      switch (message.type) {
        case 'process_batch':
          const embeddings = await worker.processBatch(message.texts);
          parentPort.postMessage({
            type: 'batch_completed',
            workerId: worker.id,
            embeddings: embeddings,
            jobId: message.jobId
          });
          break;
          
        case 'get_stats':
          parentPort.postMessage({
            type: 'stats_response',
            workerId: worker.id,
            stats: worker.getStats()
          });
          break;
          
        case 'cleanup':
          await worker.cleanup();
          parentPort.postMessage({
            type: 'cleanup_complete',
            workerId: worker.id
          });
          process.exit(0);
          break;
          
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      parentPort.postMessage({
        type: 'worker_error',
        workerId: worker.id,
        error: error.message,
        jobId: message.jobId
      });
    }
  });
  
  // Handle worker exit
  process.on('exit', () => {
    console.log(`🛑 Worker ${worker.id}: Shutting down`);
  });
}

module.exports = { EmbeddingWorker };
