const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const paystack = {
  transaction: {
    initialize: async (data) => {
      try {
        const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, data, {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        return response.data;
      } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to initialize transaction');
      }
    },
    verify: async (reference) => {
      try {
        const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        return response.data;
      } catch (error) {
        throw new Error(error.response?.data?.message || 'Failed to verify transaction');
      }
    }
  }
};

module.exports = { paystack }; 