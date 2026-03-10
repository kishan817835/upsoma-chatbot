require('dotenv').config();
const { VectorService } = require('./src/services/vectorService');
const { SimpleEmbeddingService } = require('./src/services/simpleEmbeddingService');

async function testRealSearch() {
  console.log('🔍 Testing real search for count...\n');
  
  try {
    const vectorService = new VectorService();
    const embeddingService = new SimpleEmbeddingService();
    
    await embeddingService.initialize();
    await vectorService.initialize();
    
    console.log('✅ Services initialized\n');
    
    // Use real embedding from our test text
    const testText = "This is a test document for Zilliz vector database migration testing.";
    const embeddings = await embeddingService.generateEmbeddings([testText]);
    const embedding = embeddings[0].embedding;
    
    console.log('📊 Testing search with real embedding:');
    try {
      const searchResult = await vectorService.client.search({
        collection_name: 'embeddings',
        vectors: [embedding],
        search_params: {
          anns_field: 'vector',
          topk: 1000,
          metric_type: 'COSINE'
        },
        output_fields: ['text']
      });
      
      console.log(`Search found ${searchResult.results?.length || 0} results`);
      if (searchResult.results?.length > 0) {
        console.log('First result:', JSON.stringify(searchResult.results[0], null, 2));
      }
    } catch (error) {
      console.log('❌ Search error:', error.message);
    }
    
    // Test using the VectorService search method
    console.log('\n📊 Testing VectorService.searchEmbeddings:');
    const searchResults = await vectorService.searchEmbeddings(embedding, 10, 0.1);
    console.log(`VectorService found ${searchResults.data?.length || 0} results`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealSearch();
