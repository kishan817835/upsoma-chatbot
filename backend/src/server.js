require('dotenv').config();
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { cors } = require('hono/cors');
const { SimpleEmbeddingService } = require('./services/simpleEmbeddingService');
const { VectorService } = require('./services/vectorService');
const { DocumentService } = require('./services/documentService');
const multer = require('multer');
const fs = require('fs').promises;

const app = new Hono();

// Enable CORS for all routes
app.use('/*', cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:4200', 'http://127.0.0.1:4200'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const embeddingService = new SimpleEmbeddingService();
const vectorService = new VectorService();
const documentService = new DocumentService();

// Configure multer for file uploads
const upload = multer({
  dest: process.env.UPLOAD_DIR || 'uploads/',
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed'));
    }
  }
});

// Middleware to handle multipart form data
app.use('*', async (c, next) => {
  if (c.req.method === 'POST' && c.req.path.includes('upload')) {
    // Handle multipart data
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

    const fileContent = await fs.readFile(file.path);
    function formatTimestamp(date) {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}:${month}:${year} ${hours}:${minutes}`;
    }
  
    const documentId = 'doc_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);  
    const documentResult = await documentService.processFile(file.path, fileName);
    
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
      uploadedAt: formatTimestamp(new Date())
    }));
    
    await vectorService.saveBatchEmbeddings(chunkTexts, embeddingVectors, {
      document_name: fileName,
      document_id: documentId,
      page_url: '', // Empty for file uploads
      upload_source: 'file_upload',
      total_chunks: documentResult.totalChunks,
      timestamp: formatTimestamp(new Date())
    });
    
    // Clean up uploaded file
    await fs.unlink(file.path);
    
    return c.json({
      success: true,
      message: 'Document processed and embeddings saved successfully',
      document: {
        fileName: fileName,
        documentId: documentId,
        pageUrl: '', // Empty for file uploads
        timestamp: formatTimestamp(new Date()),
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
    const { text, fileName = 'direct-input', pageUrl = '' } = body;
    
    if (!text || text.trim().length === 0) {
      return c.json({
        error: {
          message: 'Text content cannot be empty',
          type: 'invalid_request_error'
        }
      }, 400);
    }
    
    // Helper function to format timestamp
    function formatTimestamp(date) {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}:${month}:${year} ${hours}:${minutes}`;
    }
    
    // Generate random document ID
    const documentId = 'doc_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    
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
      uploadedAt: formatTimestamp(new Date())
    }));
    
    await vectorService.saveBatchEmbeddings(chunkTexts, embeddingVectors, {
      document_name: fileName,
      document_id: documentId,
      page_url: pageUrl,
      upload_source: 'direct_text',
      total_chunks: documentResult.totalChunks,
      timestamp: formatTimestamp(new Date())
    });
    
    return c.json({
      success: true,
      message: 'Text processed and embeddings saved successfully',
      document: {
        fileName: fileName,
        documentId: documentId,
        pageUrl: pageUrl,
        timestamp: formatTimestamp(new Date()),
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

app.post('/v1/chatbot', async (c) => {
  try {
    const body = await c.req.json();
    const { message } = body;
    
    if (!message || typeof message !== 'string') {
      return c.json({
        success: false,
        error: {
          message: 'Message field is required and must be a string',
          type: 'invalid_request_error'
        }
      }, 400);
    }
    
    // Step 1: Generate embedding for user message
    const queryEmbeddings = await embeddingService.generateEmbeddings([message]);
    const queryEmbedding = queryEmbeddings[0].embedding;
    
    // Step 2: Search in vector database with fixed parameters
    console.log(`🔍 Searching for: "${message}"`);
    const searchResults = await vectorService.searchEmbeddings(queryEmbedding, 3, 0.3);
    console.log(`📊 Found ${searchResults.data.length} chunks`);
    
    if (searchResults.data.length === 0) {
      console.log(`❌ No chunks found for message: "${message}"`);
      return c.json({
        success: true,
        response: "I don't have information about that in my knowledge base.",
        chunks_found: 0
      });
    }
    
    // Step 3: Check if company names match (if company mentioned in query) - TEMPORARILY DISABLED FOR TESTING
    const extractedCompany = extractCompanyFromQuery(message);
    let filteredResults = searchResults.data;
    
    console.log(`🏢 Extracted company: "${extractedCompany}"`);
    console.log(`📊 Available companies in chunks: ${searchResults.data.map(r => r.metadata?.companyName || 'Unknown').join(', ')}`);
    
    // Temporarily disable company filtering to test
    /*
    if (extractedCompany) {
      filteredResults = searchResults.data.filter(result => {
        const resultCompany = result.metadata?.companyName || result.metadata?.organization_name || '';
        return resultCompany.toLowerCase().includes(extractedCompany.toLowerCase());
      });
      
      if (filteredResults.length === 0) {
        return c.json({
          success: true,
          response: "Sorry, we do not currently have this information.",
          chunks_found: 0
        });
      }
    }
    */
    
    // Step 4: Prepare context for LLM (retrieved chunks)
    const retrievedChunks = filteredResults.map(result => result.text);
    const context = retrievedChunks.join('\n\n');
    console.log(`📝 Retrieved ${retrievedChunks.length} chunks for LLM processing`);
    
    // Step 5: Send to Sarvam AI LLM for smart response generation
    console.log(`🤖 Sending to LLM for context understanding and response generation`);
    const sarvamResponse = await callSarvamAI(message, context);
    console.log(`✅ LLM generated response: ${sarvamResponse.substring(0, 100)}...`);
    
    return c.json({
      success: true,
      response: sarvamResponse,
      chunks_found: filteredResults.length,
      processing_flow: {
        user_query: message,
        embedding_created: true,
        vector_search: {
          limit: 3,
          score_threshold: 0.3,
          chunks_retrieved: filteredResults.length
        },
        llm_processing: true,
        final_response: sarvamResponse
      }
    });
    
  } catch (error) {
    console.error('❌ Chatbot error:', error);
    return c.json({
      success: false,
      error: {
        message: error.message,
        type: 'server_error'
      }
    }, 500);
  }
});

// Helper function to extract company name from query
function extractCompanyFromQuery(query) {
  const companyPatterns = [
    /\b([A-Z][a-z]+(?:\s+(?:Inc|Corp|Corporation|Company|Co|Ltd|LLC|Group|Holdings|Technologies|Solutions|Systems|Services|Enterprises))\b)/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g
  ];
  
  for (const pattern of companyPatterns) {
    const matches = query.match(pattern);
    if (matches && matches.length > 0) {
      return matches[0];
    }
  }
  
  return null;
}

// Helper function to call Sarvam AI
async function callSarvamAI(userMessage, context) {
  const fs = require('fs').promises;
  const rulesPath = './rules.txt';
  
  try {
    const rules = await fs.readFile(rulesPath, 'utf8');
    
    // Create system prompt with rules and context for smart response generation
    const systemPrompt = `${rules}\n\nRETRIEVED CHUNKS FROM DATABASE:\n${context}\n\nUSER QUESTION: ${userMessage}\n\nINSTRUCTIONS FOR INTELLIGENT RESPONSE:\n1. Read the retrieved chunks carefully and understand the context\n2. Generate a precise, professional response\n3. Use **bold text** for key points only when necessary\n4. Use bullet points (•) only for complex multi-part questions\n5. **CRITICAL: Keep response concise - match answer length to question complexity**\n6. For "how much/many" questions: Give numbers + brief context only\n7. For "what is" questions: Give definition only\n8. For "who/where/when" questions: Give direct answer only\n9. Format professionally but keep it brief\n10. Always respond in English\n11. **Never provide long explanations unless specifically asked**\n\nRESPONSE EXAMPLES:\nQ: "How much experience does Tarannum have?"\nA: "Tarannum has 2+ years of experience in social media management, currently working as Social Media Executive at Webmeen Tech."\n\nQ: "What is SEO?"\nA: "SEO is the process of optimizing online content to improve visibility and ranking in search engine results."\n\nNow generate a precise, well-formatted response based on the retrieved chunks. Be concise!`;
    
    // Calculate dynamic max_tokens based on context length
    const contextLength = context.length;
    let maxTokens = 300; // Reduced base limit for concise responses
    
    // Moderate increase for larger contexts (but keep it reasonable)
    if (contextLength > 1000) maxTokens = 500;
    if (contextLength > 2000) maxTokens = 700;
    if (contextLength > 3000) maxTokens = 900;
    
    console.log(`📏 Context length: ${contextLength} chars, Max tokens: ${maxTokens}`);
    
    const response = await fetch(process.env.SARVAM_API_URL || 'https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`,
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY
      },
      body: JSON.stringify({
        model: 'sarvam-m',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.3
      })
    });
    
    const result = await response.json();
    
    if (result.choices && result.choices.length > 0) {
      return result.choices[0].message.content.trim();
    } else {
      return "I apologize, but I couldn't generate a response at the moment.";
    }
    
  } catch (error) {
    console.error('❌ Sarvam AI error:', error);
    return "I apologize, but I encountered an error while processing your request.";
  }
}

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
    console.log(`📍 Port: ${port}`);
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
