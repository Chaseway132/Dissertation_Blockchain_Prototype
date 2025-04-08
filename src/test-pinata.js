// Testing script for Pinata JWT
const axios = require('axios');
require('dotenv').config();

const JWT = process.env.REACT_APP_PINATA_JWT;
console.log('JWT available:', !!JWT);
console.log('JWT length:', JWT ? JWT.length : 0);

async function testPinata() {
  try {
    console.log('Testing Pinata API access...');
    
    const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
      headers: {
        'Authorization': `Bearer ${JWT}`
      }
    });
    
    console.log('Success! Response:', response.data);
    return true;
  } catch (error) {
    console.error('Error testing Pinata:', error.message);
    console.error('Response data:', error.response?.data);
    console.error('Response status:', error.response?.status);
    return false;
  }
}

// Run the test
testPinata().then(success => {
  if (success) {
    console.log('✅ Pinata connection successful!');
  } else {
    console.log('❌ Pinata connection failed!');
  }
}); 