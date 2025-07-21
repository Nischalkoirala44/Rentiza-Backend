const axios = require('axios');
const crypto = require('crypto');
const PurchasedItem = require('../models/PurchasedItem');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Location = require('../models/Room');
const UserData = require('../models/User');

async function getEsewaPaymentHash({ amount, transaction_uuid }) {
  try {
    const data = `total_amount=${amount},transaction_uuid=${transaction_uuid},product_code=${process.env.ESEWA_PRODUCT_CODE}`;
    const secretKey = process.env.ESEWA_SECRET_KEY;
    const hash = crypto.createHmac('sha256', secretKey).update(data).digest('base64');
    return {
      signature: hash,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
    };
  } catch (error) {
    throw error;
  }
}

async function verifyEsewaPayment(encodedData) {
  try {
    // Decode base64 encoded JSON string
    let decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');
    decodedData = JSON.parse(decodedData);

    const headersList = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const data = `transaction_code=${decodedData.transaction_code},status=${decodedData.status},total_amount=${decodedData.total_amount},transaction_uuid=${decodedData.transaction_uuid},product_code=${process.env.ESEWA_PRODUCT_CODE},signed_field_names=${decodedData.signed_field_names}`;

    const secretKey = process.env.ESEWA_SECRET_KEY;
    const hash = crypto.createHmac('sha256', secretKey).update(data).digest('base64');

    if (hash !== decodedData.signature) {
      throw { message: 'Invalid signature', decodedData };
    }

    const reqOptions = {
      url: `${process.env.ESEWA_GATEWAY_URL}/api/epay/transaction/status/?product_code=${process.env.ESEWA_PRODUCT_CODE}&total_amount=${decodedData.total_amount}&transaction_uuid=${decodedData.transaction_uuid}`,
      method: 'GET',
      headers: headersList,
    };

    const response = await axios.request(reqOptions);

    if (
      response.data.status !== 'COMPLETE' ||
      response.data.transaction_uuid !== decodedData.transaction_uuid ||
      Number(response.data.total_amount) !== Number(decodedData.total_amount)
    ) {
      throw { message: 'Invalid transaction data', decodedData };
    }

    return { response: response.data, decodedData };
  } catch (error) {
    throw error;
  }
}

exports.initializeEsewaPayment = async (req, res) => {
  try {
    const { locationId, totalPrice, tenantName, phone, startDate, endDate } = req.body;
    const userId = req.user.userID;

    if (!startDate || !endDate || new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'Invalid booking duration' });
    }
    if (!locationId || !totalPrice) {
      return res.status(400).json({ success: false, message: 'locationId and totalPrice are required' });
    }

    const location = await Location.findById(locationId);
    if (!location || location.price !== totalPrice.toString() || !location.isAvailable) {
      return res.status(400).json({ success: false, message: 'Location unavailable, price mismatch, or not available' });
    }

    const alreadyPurchased = await PurchasedItem.findOne({
      user: userId,
      location: locationId,
      status: { $in: ['pending', 'completed'] },
    });
    if (alreadyPurchased) {
      return res.status(409).json({ success: false, message: 'You have already initiated or completed booking for this location.' });
    }

    if (tenantName && phone) {
      await UserData.findByIdAndUpdate(userId, { name: tenantName, mobile: phone });
    }

    const purchasedItem = await PurchasedItem.create({
      user: userId,
      location: locationId,
      paymentMethod: 'esewa',
      totalPrice: totalPrice.toString(),
      status: 'pending',
      bookingDuration: { startDate: new Date(startDate), endDate: new Date(endDate) },
      tenantName,
    });

    const paymentHash = await getEsewaPaymentHash({
      amount: totalPrice.toString(),
      transaction_uuid: purchasedItem._id.toString(),
    });

    const paymentURL = `${process.env.ESEWA_GATEWAY_URL}/epay/main`;

    res.json({
      success: true,
      message: 'Payment initialized',
      paymentURL,
      params: {
        amount: totalPrice.toString(),
        tax_amount: 0,
        total_amount: totalPrice.toString(),
        transaction_uuid: purchasedItem._id.toString(),
        product_code: process.env.ESEWA_PRODUCT_CODE,
        signature: paymentHash.signature,
        signed_field_names: paymentHash.signed_field_names,
        callback_url: 'http://localhost:3001/api/eSewa/complete-payment',
      },
      purchasedItem,
    });
  } catch (error) {
    console.error('Error in initializeEsewaPayment:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.completeEsewaPayment = async (req, res) => {
  const { data } = req.query;
  try {
    const paymentInfo = await verifyEsewaPayment(data);
    const purchasedItem = await PurchasedItem.findById(paymentInfo.response.transaction_uuid).populate('location user');

    if (!purchasedItem) {
      return res.status(400).json({ success: false, message: 'Purchased item not found' });
    }

    const amountNumber = Number(purchasedItem.totalPrice);

    const paymentData = await Payment.create({
      pidx: paymentInfo.decodedData.transaction_code,
      transactionId: paymentInfo.decodedData.transaction_code,
      bookedRoom: purchasedItem._id,
      amount: amountNumber,
      dataFromVerificationReq: paymentInfo,
      apiQueryFromUser: req.query,
      paymentGateway: 'esewa',
      status: 'success',
    });

    await PurchasedItem.findByIdAndUpdate(purchasedItem._id, { status: 'completed' });

    const booking = await Booking.create({
      user: purchasedItem.user._id,
      location: purchasedItem.location._id,
      amount: amountNumber,
      paymentMethod: 'esewa',
      paymentStatus: 'success',
      esewaRefId: paymentInfo.decodedData.transaction_code,
      bookingDuration: purchasedItem.bookingDuration,
      tenantName: purchasedItem.tenantName,
    });

    await Location.findByIdAndUpdate(purchasedItem.location._id, { isAvailable: false });

    res.json({ success: true, message: 'Payment successful and booking created', paymentData, booking });
  } catch (error) {
    console.error('Error in completeEsewaPayment:', error);
    res.status(500).json({ success: false, message: 'Error verifying payment', error: error.message });
  }
};
