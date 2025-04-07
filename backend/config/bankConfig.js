const bankConfig = {
  MIN_WITHDRAWAL_AMOUNT: 1000,
  MAX_WITHDRAWAL_AMOUNT: 10000000,
  PAYSTACK: {
    BASE_URL: process.env.PAYSTACK_API_URL,
    SECRET_KEY: process.env.PAYSTACK_SECRET_KEY
  }
};

module.exports = bankConfig; 