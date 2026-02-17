const url = 'https://krbbibcoxvmcwgsugvvx.supabase.co/functions/v1/yoco-initiate';

console.log('\n=== Testing yoco-initiate WITHOUT Authorization Header ===\n');

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    orderId: 'test',
    amount: 1000,
    description: 'test'
  })
})
  .then(res => {
    console.log(`Status Code: ${res.status}`);
    return res.text();
  })
  .then(body => {
    console.log(`Response Body: ${body}`);
    
    // Verify it's the custom error, not gateway JWT error
    if (body.includes('Missing token')) {
      console.log('\n✓ PASS - Function returned custom error: {"error":"Missing token"}');
      console.log('    This proves verify_jwt=false is working correctly.');
      console.log('    Response is from function code, NOT from gateway.');
    } else if (body.includes('Invalid JWT')) {
      console.log('\n✗ FAIL - Gateway rejected with JWT error (verify_jwt not disabled)');
    } else {
      console.log('\n? UNEXPECTED - Different response received.');
    }
  })
  .catch(err => {
    console.error('Error:', err.message);
  });
