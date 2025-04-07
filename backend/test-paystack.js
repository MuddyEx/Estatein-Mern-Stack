require('dotenv').config();
const axios = require('axios');

async function testPaystackConnection() {
  try {
    console.log('Testing Paystack Connection...');
    console.log('Using API Key:', process.env.PAYSTACK_SECRET_KEY ? 'Key is set' : 'Key is missing');

    // Test the Paystack API by getting the list of banks
    const response = await axios.get('https://api.paystack.co/bank', {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.status === true) {
      console.log('\n✅ SUCCESS: Paystack connection is working!');
      console.log(`Successfully retrieved ${response.data.data.length} banks`);
      console.log('\nSample banks:');
      response.data.data.slice(0, 3).forEach(bank => {
        console.log(`- ${bank.name}`);
      });

      // Now test transaction initialization
      console.log('\nTesting transaction initialization...');
      const transactionResponse = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: 'test@example.com',
          amount: 5000, // 50 NGN in kobo
          reference: `TEST-${Date.now()}`
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (transactionResponse.data.status === true) {
        console.log('\n✅ SUCCESS: Transaction initialization works!');
        console.log('Authorization URL:', transactionResponse.data.data.authorization_url);
      } else {
        console.log('\n❌ ERROR: Could not initialize transaction');
        console.log('Error:', transactionResponse.data);
      }
    } else {
      console.log('\n❌ ERROR: Could not connect to Paystack');
      console.log('Response:', response.data);
    }
  } catch (error) {
    console.log('\n❌ ERROR: Failed to connect to Paystack');
    console.log('Error details:', error.response?.data || error.message);
  }
}

testPaystackConnection(); 