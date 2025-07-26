const express = require('express');
const bookingController = require('../controllers/bookingController');
const { authenticateUser } = require('../middleware/authMiddleware');
const { verifyRole } = require('../middleware/verifyRole');

const router = express.Router();

router.post('/book-cash', authenticateUser, verifyRole(['tenant']), bookingController.bookCashPayment);

router.get('/pending-cash-bookings', authenticateUser, verifyRole(['landlord']), bookingController.getPendingCashBookings);

router.post('/approve-booking/:bookingId', authenticateUser, verifyRole(['landlord']), bookingController.approveCashBooking);

router.post('/reject-booking/:bookingId', authenticateUser, verifyRole(['landlord']), bookingController.rejectCashBooking);

router.get('/update-availability', bookingController.setRoomAvailable);

router.get("/my-approved-bookings", authenticateUser, verifyRole(['tenant']), bookingController.getTenantBookings);

router.get("/landlord-bookings", authenticateUser, verifyRole(['landlord']), bookingController.getLandlordBookings);

module.exports = router;
