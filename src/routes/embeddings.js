const { Hono } = require('hono');
const { EmbeddingService } = require('../services/embeddingService');
const { QueueService } = require('../services/queueService');
const { BatchingService } = require('../services/batchingService');
const { RateLimiter } = require('../middleware/rateLimiter');
const { Logger } = require('../middleware/logger');

const embeddingsRouter = new Hono();

// Initialize services
const logger = new Logger();
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100
});

const queueService = new QueueService();
const embeddingService = new EmbeddingService();
const batchingService = new BatchingService(queueService, embeddingService);

// Initialize services on startup
async function initializeServices() {
  try {
    await embeddingService.initialize();
    queueService.startCleanup(); // Start periodic cleanup
    console.log('🚀 Embeddings service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize embeddings service:', error);
    throw error;
  }
}

// POST /v1/embeddings - Generate embeddings
embeddingsRouter.post('/embeddings', async (c) => {
  const startTime = Date.now();
  
  try {
    const body = await c.req.json();
    const { input, model = 'all-MiniLM-L6-v2' } = body;
    
    // Validate input
    let validatedInputs;
    try {
      validatedInputs = validateInput(input);
    } catch (validationError) {
      return c.json({
        error: {
          message: validationError.message,
          type: 'invalid_request_error'
        }
      }, 400);
    }
    
    // Add jobs to batching service
    const queueStartTime = Date.now();
    const promises = validatedInputs.map(async (text, index) => {
      return new Promise((resolve, reject) => {
        const job = {
          data: {
            input: text,
            index: index,
            model: model
          },
          resolve: resolve,
          reject: reject
        };
        batchingService.addToBatch(job);
      });
    });
    
    // Wait for all embeddings to be generated
    const embeddings = await Promise.all(promises);
    
    const processingTime = Date.now() - startTime;
    const queueWaitTime = Date.now() - queueStartTime;
    
    // Log the request
    logger.logRequest(c.req, startTime, queueWaitTime, validatedInputs.length);
    
    // Return OpenAI-style response
    const response = {
      object: 'list',
      data: embeddings,
      model: model,
      usage: {
        prompt_tokens: validatedInputs.join(' ').split(' ').length,
        total_tokens: validatedInputs.join(' ').split(' ').length
      }
    };
    
    return c.json(response);
    
  } catch (error) {
    logger.logError(error, c.req);
    
    return c.json({
      error: {
        message: 'Internal server error while generating embeddings',
        type: 'server_error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    }, 500);
  }
});

// GET /v1/stats - Get service statistics
embeddingsRouter.get('/stats', async (c) => {
  try {
    const embeddingStats = await embeddingService.getDetailedStats();
    const batchingStats = batchingService.getStats();
    const queueStats = queueService.getStats();
    const loggerStats = logger.getStats();
    
    return c.json({
      service: 'embeddings-api',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      embedding: embeddingStats,
      batching: batchingStats,
      queue: queueStats,
      logger: loggerStats,
      rate_limiter: rateLimiter.getStats()
    });
  } catch (error) {
    logger.logError(error, c.req);
    return c.json({
      error: {
        message: 'Failed to retrieve statistics',
        type: 'server_error'
      }
    }, 500);
  }
});

// Validate input function
function validateInput(input) {
  if (!input) {
    throw new Error('Input field is required');
  }

  if (typeof input === 'string') {
    if (input.trim().length === 0) {
      throw new Error('Input text cannot be empty');
    }
    return [input];
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      throw new Error('Input array cannot be empty');
    }
    
    if (input.length > 100) {
      throw new Error('Input array cannot contain more than 100 items');
    }
    
    const invalidItems = input.filter(item => typeof item !== 'string' || item.trim().length === 0);
    if (invalidItems.length > 0) {
      throw new Error('All items in input array must be non-empty strings');
    }
    
    return input;
  }

  throw new Error('Input must be a string or array of strings');
}

// Initialize services
initializeServices().catch(console.error);

module.exports = { embeddingsRouter };
