require('dotenv').config();
const { VectorService } = require('./src/services/vectorService');
const { SimpleEmbeddingService } = require('./src/services/simpleEmbeddingService');

async function testZillizOperations() {
  console.log('🧪 Testing Zilliz operations...\n');
  
  try {
    // Initialize services
    const vectorService = new VectorService();
    const embeddingService = new SimpleEmbeddingService();
    
    await embeddingService.initialize();
    await vectorService.initialize();
    
    console.log('✅ Services initialized\n');
    
    // Test 1: Insert data
    console.log('📝 Test 1: Inserting test data...');
    const testText = "This is a test document for Zilliz vector database migration testing.";
    
    // Generate embedding
    const embeddings = await embeddingService.generateEmbeddings([testText]);
    const embedding = embeddings[0].embedding;
    
    console.log(`🔢 Generated embedding with ${embedding.length} dimensions`);
    
    // Save to Zilliz
    const savedId = await vectorService.saveEmbedding(testText, embedding);
    console.log(`💾 Saved with ID: ${savedId}\n`);
    
    // Test 2: Fetch data
    console.log('🔍 Test 2: Fetching data from Zilliz...');
    
    // Search for the data we just inserted
    const searchResults = await vectorService.searchEmbeddings(embedding, 5, 0.5);
    
    console.log(`📊 Found ${searchResults.data.length} results:`);
    searchResults.data.forEach((result, index) => {
      console.log(`${index + 1}. Score: ${result.score.toFixed(4)}`);
      console.log(`   Text: "${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}"`);
      console.log(`   ID: ${result.id}\n`);
    });
    
    // Test 3: Get collection stats
    console.log('📈 Test 3: Getting collection statistics...');
    const stats = await vectorService.getStats();
    console.log('📊 Collection stats:', JSON.stringify(stats, null, 2));
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testZillizOperations();
