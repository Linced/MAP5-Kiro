// Simple connectivity test script
const axios = require('axios');

const FRONTEND_URL = 'https://map5-nine.vercel.app';
const BACKEND_URL = 'https://map5-kiro-backend.onrender.com';

async function testConnectivity() {
  console.log('🔧 Testing Backend Connectivity Fix');
  console.log('Frontend URL:', FRONTEND_URL);
  console.log('Backend URL:', BACKEND_URL);
  console.log('');

  // Test 1: Backend Health Check
  try {
    console.log('1. Testing backend health endpoint...');
    const healthResponse = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Backend health check passed');
    console.log('   Status:', healthResponse.data.status);
    console.log('   Database:', healthResponse.data.database);
  } catch (error) {
    console.log('❌ Backend health check failed');
    console.log('   Error:', error.message);
  }

  // Test 2: CORS Preflight Request
  try {
    console.log('\n2. Testing CORS preflight request...');
    const corsResponse = await axios.options(`${BACKEND_URL}/api/auth/login`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    console.log('✅ CORS preflight passed');
    console.log('   Status:', corsResponse.status);
  } catch (error) {
    console.log('❌ CORS preflight failed');
    console.log('   Error:', error.message);
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response headers:', error.response.headers);
    }
  }

  // Test 3: Actual API Request with CORS
  try {
    console.log('\n3. Testing API request with CORS headers...');
    const apiResponse = await axios.post(`${BACKEND_URL}/api/auth/check-email`, 
      { email: 'test@example.com' },
      {
        headers: {
          'Origin': FRONTEND_URL,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ API request with CORS passed');
    console.log('   Status:', apiResponse.status);
    console.log('   Response:', apiResponse.data);
  } catch (error) {
    console.log('❌ API request with CORS failed');
    console.log('   Error:', error.message);
    if (error.response) {
      console.log('   Response status:', error.response.status);
      console.log('   Response data:', error.response.data);
    }
  }

  console.log('\n🔧 Connectivity test completed');
}

// Run the test
testConnectivity().catch(console.error);