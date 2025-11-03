const http = require('http');

const testSubjectsAPI = () => {
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/subjects?limit=100',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // You'll need to add a valid token here
      'Authorization': 'Bearer YOUR_TOKEN_HERE'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('\nResponse:');
      try {
        const jsonData = JSON.parse(data);
        console.log(JSON.stringify(jsonData, null, 2));
        
        if (jsonData.data) {
          console.log(`\n📊 Subjects returned: ${jsonData.data.length || 0}`);
        }
      } catch (e) {
        console.log(data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error.message);
  });

  req.end();
};

console.log('🧪 Testing Subjects API...\n');
testSubjectsAPI();
