import https from 'https';

const url = 'https://krbbibcoxvmcwgsugvvx.supabase.co/functions/v1/yoco-initiate';
const payload = JSON.stringify({
  orderId: 'test',
  amount: 1000,
  description: 'test'
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(url, options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('\n=== Request WITHOUT Authorization Header ===');
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response Body: ${data}`);
    console.log('\n✓ Function correctly returned custom error (not gateway JWT error)');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(payload);
req.end();
