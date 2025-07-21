const express = require('express');
const bookingController = require('../controllers/BookingController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { verifyRole } = require('../middleware/verifyRole');

const router = express.Router();

router.post('/book-cash', authenticateUser, verifyRole(['tenant']), bookingController.bookCashPayment);

router.get('/pending-cash-bookings', authenticateUser, verifyRole(['landlord']), bookingController.getPendingCashBookings);

router.post('/approve-booking/:bookingId', authenticateUser, verifyRole(['landlord']), bookingController.approveCashBooking);

router.post('/reject-booking/:bookingId', authenticateUser, verifyRole(['landlord']), bookingController.rejectCashBooking);

module.exports = router;
