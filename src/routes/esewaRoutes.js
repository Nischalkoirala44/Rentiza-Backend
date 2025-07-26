const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { verifyRole } = require('../middleware/verifyRole');
const eSewaController = require('../controllers/esewaController');
const Payment = require('../models/Payment');
const Room = require('../models/Room');
const PurchasedItem = require('../models/PurchasedItem');

const router = express.Router();

router.post('/initialize-esewa', authenticateUser, verifyRole(['tenant']), eSewaController.initializeEsewaPayment);
router.get('/complete-payment', eSewaController.completeEsewaPayment);


router.get('/e-sewaSuccess', authenticateUser, verifyRole(['tenant']), async (req, res) => {
  try {
    console.log('Payment completed successfully', req.query.data);

    const { data } = req.query;
    const decodedData = Buffer.from(data, 'base64').toString('utf-8');
    console.log('Decoded data:', decodedData);

    const paymentData = JSON.parse(decodedData);

    const payment = await Payment.findOne({ pidx: paymentData.transaction_uuid });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    payment.status = 'success';
    await payment.save();

    const purchasedItem = await PurchasedItem.findById(payment.bookedRoom);
    if (!purchasedItem) {
      return res.status(404).json({ success: false, message: 'Purchased item not found' });
    }
    purchasedItem.status = 'completed';
    await purchasedItem.save();

    await Room.findByIdAndUpdate(purchasedItem.location, { isAvailable: false });

    console.log('eSewa payment successful');

    res.redirect('http://localhost:3000/pages/success');
  } catch (error) {
    console.error('Error handling eSewa success callback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

module.exports = router;
