require('dotenv').config();

const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { cors } = require('hono/cors');
const { SimpleEmbeddingService } = require('./services/simpleEmbeddingService');
const { VectorService } = require('./services/vectorService');
const { DocumentService } = require('./services/documentService');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

const app = new Hono();

app.use('/*', cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200', 'http://127.0.0.1:5500', 'https://upsoma-chatbot.netlify.app', 'null'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const embeddingService = new SimpleEmbeddingService();
const vectorService = new VectorService();
const documentService = new DocumentService();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only TXT files are supported in production deployment'));
    }
  }
});

app.use('*', async (c, next) => {
  if (c.req.method === 'POST' && c.req.path.includes('upload')) {
   
    return next();
  }
  return next();
});

// Health check endpoint
app.get('/health', async (c) => {
  try {
    const stats = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'windsurf-chatbot-api',
      version: '1.0.0',
      model: 'all-MiniLM-L6-v2',
      dimensions: 384,
      vector_db: await vectorService.getStats(),
      document_processor: documentService.getStats()
    };
    
    return c.json(stats);
  } catch (error) {
    return c.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    }, 500);
  }
});

// File upload endpoint
app.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file;
    
    if (!file) {
      return c.json({
        error: {
          message: 'No file provided',
          type: 'invalid_request_error'
        }
      }, 400);
    }

    // Validate file type
    const fileName = file.name;
    const allowedTypes = ['.pdf', '.txt'];
    const ext = path.extname(fileName).toLowerCase();
    
    if (!allowedTypes.includes(ext)) {
      return c.json({
        error: {
          message: 'Only PDF and TXT files are allowed',
          type: 'invalid_request_error'
        }
      }, 400);
    }

    // Read file content
    const fileContent = await fs.readFile(file.path);
    
    // Process document
    const documentResult = await documentService.processFile(file.path, fileName);
    
    // Generate embeddings for all chunks
    const chunkTexts = documentResult.chunks.map(chunk => chunk.text);
    const embeddings = await embeddingService.generateEmbeddings(chunkTexts);
    
    // Save to vector database with metadata
    const embeddingVectors = embeddings.map(e => e.embedding);
    const metadata = documentResult.chunks.map((chunk, index) => ({
      text: chunk.text,
      fileName: chunk.fileName,
      chunkIndex: chunk.chunkIndex,
      wordCount: chunk.wordCount,
      characterCount: chunk.characterCount,
      totalChunks: documentResult.totalChunks,
      uploadedAt: new Date().toISOString()
    }));
    
    await vectorService.saveBatchEmbeddings(chunkTexts, embeddingVectors, {
      document_name: fileName,
      upload_source: 'file_upload',
      total_chunks: documentResult.totalChunks
    });
    
    // Clean up uploaded file
    await fs.unlink(file.path);
    
    return c.json({
      success: true,
      message: 'Document processed and embeddings saved successfully',
      document: {
        fileName: fileName,
        totalChunks: documentResult.totalChunks,
        embeddingsGenerated: embeddings.length
      },
      vector_db: {
        saved: true,
        collection: 'embeddings'
      }
    });
    
  } catch (error) {
    return c.json({
      error: {
        message: error.message,
        type: 'server_error'
      }
    }, 500);
  }
});

// Direct text input endpoint
app.post('/upload/text', async (c) => {
  try {
    const body = await c.req.json();
    const { text, fileName = 'direct-input' } = body;
    
    if (!text || text.trim().length === 0) {
      return c.json({
        error: {
          message: 'Text content cannot be empty',
          type: 'invalid_request_error'
        }
      }, 400);
    }
    
    // Process text
    const documentResult = await documentService.processDirectText(text, fileName);
    
    // Generate embeddings for all chunks
    const chunkTexts = documentResult.chunks.map(chunk => chunk.text);
    const embeddings = await embeddingService.generateEmbeddings(chunkTexts);
    
    // Save to vector database with metadata
    const embeddingVectors = embeddings.map(e => e.embedding);
    const metadata = documentResult.chunks.map((chunk, index) => ({
      text: chunk.text,
      fileName: chunk.fileName,
      chunkIndex: chunk.chunkIndex,
      wordCount: chunk.wordCount,
      characterCount: chunk.characterCount,
      totalChunks: documentResult.totalChunks,
      uploadedAt: new Date().toISOString()
    }));
    
    await vectorService.saveBatchEmbeddings(chunkTexts, embeddingVectors, {
      document_name: fileName,
      upload_source: 'direct_text',
      total_chunks: documentResult.totalChunks
    });
    
    return c.json({
      success: true,
      message: 'Text processed and embeddings saved successfully',
      document: {
        fileName: fileName,
        totalChunks: documentResult.totalChunks,
        embeddingsGenerated: embeddings.length
      },
      vector_db: {
        saved: true,
        collection: 'embeddings'
      }
    });
    
  } catch (error) {
    return c.json({
      error: {
        message: error.message,
        type: 'server_error'
      }
    }, 500);
  }
});

// Enhanced search endpoint with RAG
app.post('/v1/search', async (c) => {
  try {
    const body = await c.req.json();
    const { query, limit = 5, score_threshold = 0.4, use_llm = false } = body;
    
    if (!query || typeof query !== 'string') {
      return c.json({
        error: {
          message: 'Query field is required and must be a string',
          type: 'invalid_request_error'
        }
      }, 400);
    }
    
    // Generate embedding for query
    const queryEmbeddings = await embeddingService.generateEmbeddings([query]);
    const queryEmbedding = queryEmbeddings[0].embedding;
    
    // Search in Qdrant
    const searchResults = await vectorService.searchEmbeddings(queryEmbedding, limit, score_threshold);
    
    // Prepare response with grouped results
    const response = {
      object: 'list',
      data: searchResults.data,
      groupedResults: searchResults.groupedResults || {},
      query: query,
      model: 'all-MiniLM-L6-v2',
      results_count: searchResults.data.length,
      search_params: {
        limit: limit,
        score_threshold: score_threshold
      }
    };
    
    // If LLM integration is requested (placeholder for future)
    if (use_llm && results.length > 0) {
      response.context_for_llm = {
        context_chunks: results.map(r => r.text),
        sources: results.map(r => ({
          fileName: r.metadata?.fileName || 'unknown',
          score: r.score,
          chunkIndex: r.metadata?.chunkIndex || 0
        }))
      };
    }
    
    return c.json(response);
    
  } catch (error) {
    return c.json({
      error: {
        message: 'Internal server error while searching',
        type: 'server_error'
      }
    }, 500);
  }
});

// Legacy embeddings endpoint (for compatibility)
app.post('/v1/embeddings', async (c) => {
  try {
    const body = await c.req.json();
    const { input, model = 'all-MiniLM-L6-v2', save_to_db = true } = body;
    
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
    
    // Generate embeddings
    const embeddings = await embeddingService.generateEmbeddings(validatedInputs);
    
    // Auto-save to Qdrant if enabled
    if (save_to_db) {
      try {
        const embeddingVectors = embeddings.map(e => e.embedding);
        await vectorService.saveBatchEmbeddings(validatedInputs, embeddingVectors, {
          request_source: 'api',
          model: model
        });
      } catch (dbError) {
        console.error('⚠️ Failed to save to database:', dbError);
      }
    }
    
    // Return OpenAI-style response
    const response = {
      object: 'list',
      data: embeddings,
      model: model,
      usage: {
        prompt_tokens: validatedInputs.join(' ').split(' ').length,
        total_tokens: validatedInputs.join(' ').split(' ').length
      },
      saved_to_db: save_to_db
    };
    
    return c.json(response);
    
  } catch (error) {
    return c.json({
      error: {
        message: 'Internal server error while generating embeddings',
        type: 'server_error'
      }
    }, 500);
  }
});

// Vector database stats endpoint
app.get('/v1/vector-stats', async (c) => {
  try {
    const stats = await vectorService.getStats();
    return c.json(stats);
  } catch (error) {
    return c.json({
      error: {
        message: 'Failed to get vector database stats',
        type: 'server_error'
      }
    }, 500);
  }
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    service: 'Windsurf Chatbot API',
    version: '1.0.0',
    status: 'running',
    features: [
      'File Upload (PDF/TXT)',
      'Document Chunking',
      'Vector Storage',
      'Semantic Search',
      'RAG Ready',
      'Qdrant Integration'
    ],
    endpoints: {
      health: 'GET /health',
      upload_file: 'POST /upload',
      upload_text: 'POST /upload/text',
      search: 'POST /v1/search',
      embeddings: 'POST /v1/embeddings',
      vector_stats: 'GET /v1/vector-stats'
    }
  });
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

// Start server
const port = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('\n🚀 Starting Windsurf Chatbot API v1.0.0');
    console.log(`📍 Port: ${process.env.PORT || 3000}`);
    console.log(`🤖 Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)`);
    console.log(`🗄️  Vector DB: Qdrant Cloud`);
    console.log(`📄 File Upload: PDF & TXT supported`);
    
    // Ensure uploads directory exists
    try {
      await fs.mkdir('uploads', { recursive: true });
    } catch (err) {
      // Directory already exists
    }
    
    // Initialize services
    await embeddingService.initialize();
    await vectorService.initialize();
    
    // Start the server
    serve({
      fetch: app.fetch,
      port: port
    }, () => {
      console.log('\n✨ Server is ready to accept requests!');
      console.log(`🏥 Health Check: GET http://localhost:${port}/health`);
      console.log(`📄 File Upload: POST http://localhost:${port}/upload`);
      console.log(`📝 Text Upload: POST http://localhost:${port}/upload/text`);
      console.log(`🔍 Semantic Search: POST http://localhost:${port}/v1/search`);
      console.log(`🔢 Embeddings: POST http://localhost:${port}/v1/embeddings`);
      console.log(`📊 Vector Stats: GET http://localhost:${port}/v1/vector-stats`);
      console.log('\n🎯 Features active:');
      console.log('   • File Upload & Processing');
      console.log('   • Document Chunking (300 words)');
      console.log('   • Automatic Vector Storage');
      console.log('   • Semantic Search');
      console.log('   • RAG Ready for LLM');
      console.log('   • Qdrant Integration');
      console.log('   • Error handling');
      console.log('   • Health monitoring');
      console.log('---\n');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received: Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received: Shutting down gracefully...');
  process.exit(0);
});

startServer().catch(console.error);
