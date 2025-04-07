const Payment = require('../models/Payment');
const Apartment = require('../models/Apartment');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { paystack } = require('../config/paystack');
const crypto = require('crypto');

// Initialize payment
exports.initializePayment = async (req, res) => {
  try {
    console.log('Initializing payment request:', req.body);
    const { apartmentId, bookingData } = req.body;
    const userEmail = req.user.email;

    // Verify apartment exists and is available
    const apartment = await Apartment.findOne({ 
      _id: apartmentId,
      availability: 'Available'
    });

    if (!apartment) {
      console.log('❌ Payment initialization failed: Apartment not found or not available');
      return res.status(404).json({
        success: false,
        message: 'Apartment not found or not available'
      });
    }

    // Get user details by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log('❌ Payment initialization failed: User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('Creating payment record for:', {
      userId: user._id,
      apartmentId,
      amount: bookingData.totalAmount
    });

    // Create payment record
    const payment = await Payment.create({
      userId: user._id,
      apartmentId,
      bookingData: {
        ...bookingData,
        totalAmount: bookingData.totalAmount
      },
      amount: bookingData.amount,
      status: 'pending',
      paymentMethod: 'card',
      transactionReference: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    console.log('Payment record created:', {
      paymentId: payment._id,
      transactionReference: payment.transactionReference
    });

    // Initialize Paystack transaction
    const paystackPayload = {
      email: user.email,
      amount: Math.round(payment.amount * 100), // Convert to kobo (Paystack uses the smallest currency unit)
      reference: payment.transactionReference,
      callback_url: `${process.env.FRONTEND_URL}/payment/verify/${payment.transactionReference}`,
      metadata: {
        paymentId: payment._id.toString(),
        apartmentId: apartment._id.toString(),
        userId: user._id.toString(),
        custom_fields: [
          {
            display_name: "Apartment",
            variable_name: "apartment",
            value: apartment.title || apartment.location
          }
        ]
      }
    };

    console.log('Initializing Paystack transaction:', paystackPayload);

    const initializeResponse = await paystack.transaction.initialize(paystackPayload);
    console.log('Paystack initialization response:', initializeResponse);

    if (!initializeResponse.status) {
      throw new Error(initializeResponse.message || 'Failed to initialize Paystack payment');
    }

    return res.status(200).json({
      success: true,
      message: 'Payment initialization successful',
      data: {
        access_code: initializeResponse.data.access_code,
        reference: initializeResponse.data.reference,
        amount: payment.amount
      }
    });
  } catch (error) {
    console.error('❌ Payment initialization error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize payment'
    });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { transactionReference } = req.params;
    console.log('Verifying payment:', { transactionReference });

    // Find the payment record
    const payment = await Payment.findOne({ transactionReference })
      .populate('apartmentId')
      .populate('userId');

    if (!payment) {
      console.log('❌ Payment verification failed: Payment not found');
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Verify payment with Paystack
    const verifyResponse = await paystack.transaction.verify(transactionReference);
    console.log('Paystack verification response:', verifyResponse);

    if (!verifyResponse.status) {
      throw new Error(verifyResponse.message || 'Failed to verify payment');
    }

    const { data } = verifyResponse;

    if (data.status === 'success' && payment.status !== 'completed') {
      // Calculate commission and agent amount
      const adminCommissionRate = 0.10; // 10%
      const totalAmount = payment.amount;
      const adminCommissionAmount = totalAmount * adminCommissionRate;
      const agentAmount = totalAmount - adminCommissionAmount;

      // Update original payment record as the booking payment
      payment.status = 'completed';
      payment.paymentDate = new Date();
      payment.type = 'booking';
      payment.metadata = {
        paystackReference: data.reference,
        channel: data.channel,
        cardType: data.authorization?.card_type,
        last4: data.authorization?.last4,
        bank: data.authorization?.bank
      };
      await payment.save();

      // Create admin commission transaction
      await Payment.create({
        userId: payment.userId,
        apartmentId: payment.apartmentId,
        amount: adminCommissionAmount,
        type: 'commission',
        status: 'completed',
        paymentMethod: payment.paymentMethod,
        transactionReference: `COM-${payment.transactionReference}`,
        paymentDate: new Date(),
        adminCommission: adminCommissionAmount,
        agentAmount: 0,
        bookingData: payment.bookingData,
        metadata: {
          originalPaymentId: payment._id,
          originalReference: payment.transactionReference,
          isAdminCommission: true
        }
      });

      // Create agent payment transaction
      await Payment.create({
        userId: payment.userId,
        apartmentId: payment.apartmentId,
        amount: agentAmount,
        type: 'booking',
        status: 'completed',
        paymentMethod: payment.paymentMethod,
        transactionReference: `AGT-${payment.transactionReference}`,
        paymentDate: new Date(),
        adminCommission: 0,
        agentAmount: agentAmount,
        bookingData: payment.bookingData,
        metadata: {
          originalPaymentId: payment._id,
          originalReference: payment.transactionReference,
          isAgentPayment: true
        }
      });

      // Update apartment availability
      const apartment = await Apartment.findById(payment.apartmentId);
      if (apartment) {
        apartment.availability = 'Unavailable';
        apartment.rentedBy = payment.userId;
        await apartment.save();

        // Send confirmation emails
        try {
          // Send to user
          await sendEmail(
            payment.userId.email,
            'Booking Confirmation',
            `Dear ${payment.userId.fullName},\n\n` +
            `Your booking has been confirmed for the property at ${apartment.location}.\n\n` +
            `Booking Details:\n` +
            `- Check-in: ${new Date(payment.bookingData.checkIn).toLocaleDateString()}\n` +
            `- Check-out: ${new Date(payment.bookingData.checkOut).toLocaleDateString()}\n` +
            `- Amount Paid: ₦${payment.amount.toLocaleString()}\n\n` +
            `You can view your booking details in your dashboard.\n\n` +
            `Best regards,\nEstatien Team`
          );

          // Send to agent if exists
          if (apartment.agentId) {
            await apartment.populate('agentId');
            if (apartment.agentId.email) {
              await sendEmail(
                apartment.agentId.email,
                'New Booking Confirmation',
                `Dear ${apartment.agentId.fullName || 'Agent'},\n\n` +
                `A booking has been confirmed for your property at ${apartment.location}.\n\n` +
                `Booking Details:\n` +
                `- Check-in: ${new Date(payment.bookingData.checkIn).toLocaleDateString()}\n` +
                `- Check-out: ${new Date(payment.bookingData.checkOut).toLocaleDateString()}\n` +
                `- Total Amount: ₦${payment.amount.toLocaleString()}\n\n` +
                `Payment Breakdown:\n` +
                `- Admin Commission (10%): ₦${adminCommissionAmount.toLocaleString()}\n` +
                `- Your Earnings (90%): ₦${agentAmount.toLocaleString()}\n\n` +
                `Your earnings have been credited to your account and are available for withdrawal.\n\n` +
                `Guest Information:\n` +
                `- Name: ${payment.userId.fullName}\n` +
                `- Email: ${payment.userId.email}\n` +
                `- Number of Guests: ${payment.bookingData.guests || 'Not specified'}\n\n` +
                `Please ensure the property is ready for the guest's arrival.\n\n` +
                `Best regards,\nEstatien Team`
              );
            }
          }
        } catch (emailError) {
          console.error('Failed to send confirmation emails:', emailError);
          // Continue execution even if email fails
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          payment,
          apartment
        }
      });
    }

    return res.status(200).json({
      success: false,
      message: `Payment not completed. Status: ${data.status}`,
      data: {
        status: data.status,
        payment
      }
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};

// Handle webhook
exports.handleWebhook = async (req, res) => {
  try {
    console.log('Received Paystack webhook:', {
      event: req.body.event,
      data: req.body.data
    });

    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.log('❌ Invalid webhook signature');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const { event, data } = req.body;

    if (event === 'charge.success') {
      const payment = await Payment.findOne({ transactionReference: data.reference });
      
      if (!payment) {
        console.log('❌ Payment not found for webhook:', data.reference);
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      if (payment.status !== 'completed') {
        payment.status = 'completed';
        payment.paymentDate = new Date();
        payment.metadata = {
          paystackReference: data.reference,
          channel: data.channel,
          cardType: data.authorization?.card_type,
          last4: data.authorization?.last4,
          bank: data.authorization?.bank
        };
        await payment.save();

        // Update apartment availability
        await Apartment.findByIdAndUpdate(payment.apartmentId, {
          availability: 'Unavailable',
          rentedBy: payment.userId
        });

        console.log('✅ Payment completed via webhook:', {
          reference: data.reference,
          amount: data.amount / 100
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process webhook'
    });
  }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    console.log(`Fetching payment history for ${isAdmin ? 'admin' : 'user'}:`, req.user._id);

    let query = {};
    if (!isAdmin) {
      // For regular users, show only their transactions
      query.userId = req.user._id;
    } else {
      // For admin, show all commission transactions
      query = {
        type: 'commission',
        status: 'completed',
        'metadata.isAdminCommission': true
      };
    }

    const payments = await Payment.find(query)
      .populate('apartmentId')
      .populate({
        path: 'apartmentId',
        populate: {
          path: 'agentId',
          select: 'fullName email'
        }
      })
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });

    console.log('✅ Successfully retrieved payment history:', {
      userId: req.user._id,
      count: payments.length,
      isAdmin
    });

    return res.status(200).json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('❌ Payment history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
}; 