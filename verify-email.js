// Quick script to verify email for development
// Usage: node verify-email.js your-email@example.com

const axios = require('axios');

const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  console.error('Usage: node verify-email.js your-email@example.com');
  process.exit(1);
}

async function verifyEmail() {
  try {
    console.log(`Attempting to verify email: ${email}`);
    
    const response = await axios.post('http://localhost:3001/api/auth/dev-verify', {
      email: email
    });

    if (response.data.success) {
      console.log('✅ Email verified successfully!');
      console.log('You can now log in with your account.');
    } else {
      console.log('❌ Failed to verify email:', response.data.error?.message);
    }
  } catch (error) {
    if (error.response) {
      console.log('❌ Error:', error.response.data.error?.message || 'Unknown error');
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

verifyEmail();