const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['esewa', 'cash'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'success', 'failed', 'pending_approval', 'cash_on_delivery'], default: 'pending' },
  esewaRefId: { type: String },
  bookingDuration: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  tenantName: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
