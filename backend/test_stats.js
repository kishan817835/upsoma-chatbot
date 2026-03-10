require('dotenv').config();
const { VectorService } = require('./src/services/vectorService');

async function testZillizStats() {
  console.log('🔍 Testing Zilliz statistics...\n');
  
  try {
    const vectorService = new VectorService();
    await vectorService.initialize();
    
    console.log('✅ Service initialized\n');
    
    // Test different ways to get stats
    console.log('📊 Method 1: getCollectionInfo()');
    try {
      const info = await vectorService.getCollectionInfo();
      console.log('Result:', JSON.stringify(info, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    console.log('\n📊 Method 2: Direct client stats');
    try {
      const stats = await vectorService.client.getCollectionStatistics({
        collection_name: 'embeddings'
      });
      console.log('Raw stats response:', JSON.stringify(stats, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    console.log('\n📊 Method 3: Describe collection');
    try {
      const desc = await vectorService.client.describeCollection({
        collection_name: 'embeddings'
      });
      console.log('Collection description:', JSON.stringify(desc, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    console.log('\n📊 Method 4: Load collection then check stats');
    try {
      await vectorService.client.loadCollection({
        collection_name: 'embeddings'
      });
      
      const statsAfterLoad = await vectorService.client.getCollectionStatistics({
        collection_name: 'embeddings'
      });
      console.log('Stats after load:', JSON.stringify(statsAfterLoad, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testZillizStats();
