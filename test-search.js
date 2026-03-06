const http = require('http');

const searchQuery = {
  query: "artificial intelligence",
  limit: 5,
  score_threshold: 0.5
};

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
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Search Results:');
    try {
      const parsed = JSON.parse(data);
      console.log(`Found ${parsed.results_count} results`);
      parsed.data.forEach((result, index) => {
        console.log(`\n${index + 1}. Score: ${result.score.toFixed(4)}`);
        console.log(`   Text: "${result.text}"`);
        console.log(`   Timestamp: ${result.timestamp}`);
      });
    } catch (e) {
      console.log('❌ Failed to parse response:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
