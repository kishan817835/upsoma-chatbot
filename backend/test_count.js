require('dotenv').config();
const { VectorService } = require('./src/services/vectorService');

async function testCount() {
  console.log('🔍 Testing document count...\n');
  
  try {
    const vectorService = new VectorService();
    await vectorService.initialize();
    
    console.log('✅ Service initialized\n');
    
    // Test search-based counting
    console.log('📊 Testing search-based count:');
    try {
      const dummyEmbedding = new Array(384).fill(0);
      const searchResult = await vectorService.client.search({
        collection_name: 'embeddings',
        vectors: [dummyEmbedding],
        search_params: {
          anns_field: 'vector',
          topk: 1000,
          metric_type: 'COSINE'
        },
        output_fields: ['text']
      });
      
      console.log(`Search found ${searchResult.results?.length || 0} results`);
      console.log('First result sample:', JSON.stringify(searchResult.results?.[0], null, 2));
    } catch (error) {
      console.log('❌ Search error:', error.message);
    }
    
    // Test actual getStats method
    console.log('\n📊 Testing getStats method:');
    const stats = await vectorService.getStats();
    console.log('Stats result:', JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCount();
