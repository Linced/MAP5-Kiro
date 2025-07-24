// Script to wake up hibernated backend and test connectivity
const axios = require('axios');

const BACKEND_URL = 'https://map5-kiro-backend.onrender.com';
const MAX_ATTEMPTS = 10;
const DELAY_SECONDS = 15;

async function wakeBackend() {
  console.log('🔧 Attempting to wake up backend service...');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Max attempts: ${MAX_ATTEMPTS}`);
  console.log(`Delay between attempts: ${DELAY_SECONDS} seconds\n`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Attempt ${attempt}/${MAX_ATTEMPTS}:`);
    
    try {
      console.log('  Sending wake-up request...');
      const response = await axios.get(`${BACKEND_URL}/health`, {
        timeout: 30000 // 30 second timeout
      });
      
      console.log('  ✅ Backend is awake!');
      console.log('  Status:', response.status);
      console.log('  Health data:', response.data);
      
      // Test CORS as well
      console.log('\n  Testing CORS configuration...');
      try {
        const corsResponse = await axios.post(`${BACKEND_URL}/api/auth/check-email`, 
          { email: 'test@example.com' },
          {
            headers: {
              'Origin': 'https://map5-nine.vercel.app',
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('  ✅ CORS test passed!');
        console.log('  Response:', corsResponse.data);
      } catch (corsError) {
        console.log('  ⚠️ CORS test failed:', corsError.message);
        if (corsError.response) {
          console.log('  Status:', corsError.response.status);
          console.log('  Data:', corsError.response.data);
        }
      }
      
      console.log('\n🎉 Backend connectivity test completed successfully!');
      return;
      
    } catch (error) {
      if (error.response?.status === 503) {
        console.log('  💤 Backend still hibernating...');
        if (error.response.headers['x-render-routing']?.includes('hibernate')) {
          console.log('  📡 Render is waking up the service...');
        }
      } else {
        console.log('  ❌ Error:', error.message);
        if (error.response) {
          console.log('  Status:', error.response.status);
          console.log('  Headers:', error.response.headers);
        }
      }
      
      if (attempt < MAX_ATTEMPTS) {
        console.log(`  ⏳ Waiting ${DELAY_SECONDS} seconds before next attempt...\n`);
        await new Promise(resolve => setTimeout(resolve, DELAY_SECONDS * 1000));
      }
    }
  }
  
  console.log('\n❌ Failed to wake up backend after all attempts.');
  console.log('This might indicate:');
  console.log('1. Deployment is still in progress');
  console.log('2. Build failed on Render');
  console.log('3. Service configuration issue');
  console.log('\nCheck Render dashboard for deployment status.');
}

// Run the wake-up process
wakeBackend().catch(console.error);