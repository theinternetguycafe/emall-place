#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

async function main() {
  console.log('\n=== Yoco Credentials Setup for Supabase Functions ===\n');
  
  // Ask which environment
  console.log('Which environment are you setting up?');
  console.log('1. SANDBOX/TEST (for development)');
  console.log('2. LIVE/PRODUCTION (for real payments)\n');
  
  const envChoice = await question('Enter 1 or 2: ');
  
  if (envChoice !== '1' && envChoice !== '2') {
    console.log('Invalid choice. Exiting.');
    rl.close();
    return;
  }
  
  const isLive = envChoice === '2';
  const modeLabel = isLive ? 'LIVE' : 'SANDBOX';
  const expectedKeyPrefix = isLive ? 'sk_live_' : 'sk_test_';
  const mode = isLive ? 'live' : 'sandbox';
  
  console.log(`\n✓ Selected: ${modeLabel} environment\n`);
  
  // Ask for secret key
  console.log(`Go to: https://dashboard.${isLive ? '' : 'sandbox.'}yoco.com/settings/developers`);
  console.log(`Find and copy your SECRET KEY (should start with "${expectedKeyPrefix}")\n`);
  
  const secretKey = await question('Paste your Yoco SECRET KEY: ');
  
  // Validate key format
  if (!secretKey.startsWith('sk_')) {
    console.log('\n✗ ERROR: Key does not start with "sk_" - appears to be a PUBLIC key, not SECRET key');
    console.log('Please use the SECRET KEY from Yoco Dashboard, not the Public Key.');
    rl.close();
    return;
  }
  
  if (isLive && !secretKey.includes('live')) {
    console.log('\n⚠ WARNING: You selected LIVE mode but key contains "test"');
    const confirm = await question('Are you sure? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      rl.close();
      return;
    }
  }
  
  if (!isLive && secretKey.includes('live')) {
    console.log('\n⚠ WARNING: You selected SANDBOX mode but key contains "live"');
    const confirm = await question('Are you sure? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      rl.close();
      return;
    }
  }
  
  // Confirm project ID
  const projectId = await question('\nEnter your Supabase Project ID (from settings): ');
  
  if (!projectId) {
    console.log('Project ID required. Exiting.');
    rl.close();
    return;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Environment:    ${modeLabel} (${mode})`);
  console.log(`Secret Key:     ${secretKey.substring(0, 15)}...${secretKey.slice(-5)}`);
  console.log(`Project ID:     ${projectId}`);
  console.log('='.repeat(60));
  
  console.log('\nRun these commands to set your Supabase secrets:\n');
  
  console.log(`npx supabase secrets set YOCO_SECRET_KEY "${secretKey}" --project-id ${projectId}`);
  console.log(`npx supabase secrets set YOCO_MODE "${mode}" --project-id ${projectId}`);
  
  console.log('\nThen deploy the function:');
  console.log(`npx supabase functions deploy yoco-initiate --no-verify-jwt\n`);
  
  rl.close();
}

main();
