const http = require('http');

// Test different search queries
const searchQueries = [
  { query: "artificial intelligence", limit: 5 },
  { query: "machine learning", limit: 3 },
  { query: "AI technology", limit: 2 },
  { query: "data science", limit: 4 }
];

searchQueries.forEach((searchQuery, index) => {
  setTimeout(() => {
    console.log(`\n=== Search ${index + 1}: "${searchQuery.query}" ===`);
    
    const postData = JSON.stringify(searchQuery);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/v1/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`Found ${parsed.results_count} results:`);
          parsed.data.forEach((result, i) => {
            console.log(`  ${i + 1}. Score: ${result.score.toFixed(4)} - "${result.text}"`);
          });
        } catch (e) {
          console.log('❌ Error:', e.message);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('❌ Request error:', e.message);
    });
    
    req.write(postData);
    req.end();
  }, index * 1000); // 1 second delay between searches
});
