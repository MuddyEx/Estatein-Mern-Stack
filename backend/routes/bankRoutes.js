const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/authMiddleware');
const bankConfig = require('../config/bankConfig');

// Get withdrawal limits
router.get('/config', protect, async (req, res) => {
  res.json({
    status: true,
    data: {
      minWithdrawal: bankConfig.MIN_WITHDRAWAL_AMOUNT,
      maxWithdrawal: bankConfig.MAX_WITHDRAWAL_AMOUNT
    }
  });
});

// Get list of banks
router.get('/', protect, async (req, res) => {
  try {
    console.log('Fetching banks from Paystack...'); // Debug log
    const response = await axios.get(`${bankConfig.PAYSTACK.BASE_URL}/bank`, {
      headers: {
        'Authorization': `Bearer ${bankConfig.PAYSTACK.SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.status) {
      // Filter out duplicates and sort alphabetically
      const uniqueBanks = Array.from(
        new Map(response.data.data.map(bank => [bank.code, bank])).values()
      ).sort((a, b) => a.name.localeCompare(b.name));

      console.log(`Successfully fetched ${uniqueBanks.length} banks`); // Debug log
      res.json({ status: true, data: uniqueBanks });
    } else {
      console.error('Paystack API returned false status'); // Debug log
      res.status(400).json({ status: false, message: 'Failed to fetch banks' });
    }
  } catch (error) {
    console.error('Error fetching banks:', error.response?.data || error.message);
    res.status(500).json({ 
      status: false, 
      message: error.response?.data?.message || 'Failed to fetch banks' 
    });
  }
});

// Verify bank account
router.get('/verify-account', protect, async (req, res) => {
  const { account_number, bank_code } = req.query;

  if (!account_number || !bank_code) {
    return res.status(400).json({ 
      status: false, 
      message: 'Account number and bank code are required' 
    });
  }

  try {
    console.log('Verifying account:', { account_number, bank_code }); // Debug log
    const response = await axios.get(
      `${bankConfig.PAYSTACK.BASE_URL}/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        headers: {
          'Authorization': `Bearer ${bankConfig.PAYSTACK.SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status) {
      console.log('Account verified successfully'); // Debug log
      res.json({ 
        status: true, 
        data: { account_name: response.data.data.account_name } 
      });
    } else {
      console.error('Paystack API returned false status for account verification'); // Debug log
      res.status(400).json({ 
        status: false, 
        message: 'Could not verify account' 
      });
    }
  } catch (error) {
    console.error('Error verifying account:', error.response?.data || error.message);
    res.status(500).json({ 
      status: false, 
      message: error.response?.data?.message || 'Could not verify account' 
    });
  }
});

module.exports = router; 