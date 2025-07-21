const PurchasedItem = require('../models/PurchasedItem');
const Booking = require('../models/Booking');
const Location = require('../models/Room');
const UserData = require('../models/User');

exports.bookCashPayment = async (req, res) => {
  try {
    const { locationId, totalPrice, tenantName, phone, startDate, endDate } = req.body;
    const userId = req.user.userID;

    if (!startDate || !endDate || new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'Invalid booking duration' });
    }
    if (!locationId || !totalPrice) {
      return res.status(400).json({ message: 'locationId and totalPrice are required' });
    }

    const location = await Location.findById(locationId);
    if (!location || location.price !== totalPrice.toString() || !location.isAvailable) {
      return res.status(400).json({ message: 'Location unavailable, price mismatch, or not available' });
    }

    const alreadyPurchased = await PurchasedItem.findOne({
      user: userId,
      location: locationId,
      status: { $in: ['pending', 'awaiting_approval', 'completed'] },
    });
    if (alreadyPurchased) {
      return res.status(409).json({ message: 'You have already booked or initiated booking for this location.' });
    }

    if (tenantName && phone) {
      await UserData.findByIdAndUpdate(userId, { name: tenantName, mobile: phone });
    }

    const purchasedItem = await PurchasedItem.create({
      user: userId,
      location: locationId,
      paymentMethod: 'cash',
      totalPrice: totalPrice.toString(),
      status: 'awaiting_approval',
      bookingDuration: { startDate: new Date(startDate), endDate: new Date(endDate) },
      tenantName,
    });

    const booking = await Booking.create({
      user: userId,
      location: locationId,
      amount: Number(totalPrice),
      paymentMethod: 'cash',
      paymentStatus: 'pending_approval',
      bookingDuration: purchasedItem.bookingDuration,
      tenantName,
    });

    res.status(201).json({
      message: 'Room booking request submitted. Awaiting landlord approval.',
      booking,
    });
  } catch (error) {
    console.error('Error in bookCashPayment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPendingCashBookings = async (req, res) => {
  try {
    const pendingBookings = await Booking.find({ paymentMethod: 'cash', paymentStatus: 'pending_approval' })
      .populate('user location')
      .sort({ createdAt: -1 });

    res.json({ success: true, pendingBookings });
  } catch (error) {
    console.error('Error fetching pending cash bookings:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.approveCashBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.paymentMethod !== 'cash' || booking.paymentStatus !== 'pending_approval') {
      return res.status(404).json({ message: 'Booking not found or not pending approval' });
    }

    booking.paymentStatus = 'success';
    await booking.save();

    await PurchasedItem.findOneAndUpdate(
      { user: booking.user, location: booking.location, status: 'awaiting_approval' },
      { status: 'completed' }
    );

    await Location.findByIdAndUpdate(booking.location, { isAvailable: false });

    res.json({ message: 'Booking approved and room marked unavailable', booking });
  } catch (error) {
    console.error('Error approving booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.rejectCashBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.paymentMethod !== 'cash' || booking.paymentStatus !== 'pending_approval') {
      return res.status(404).json({ message: 'Booking not found or not pending approval' });
    }

    booking.paymentStatus = 'failed';
    await booking.save();

    await PurchasedItem.findOneAndUpdate(
      { user: booking.user, location: booking.location, status: 'awaiting_approval' },
      { status: 'failed' }
    );

    res.json({ message: 'Booking rejected by landlord', booking });
  } catch (error) {
    console.error('Error rejecting booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
