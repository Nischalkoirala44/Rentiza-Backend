const mongoose = require('mongoose');

const PurchasedItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  paymentMethod: { type: String, enum: ['esewa', 'cash'], required: true },
  totalPrice: { type: String, required: true },
  status: { type: String, enum: ['pending', 'awaiting_approval', 'completed', 'failed'], default: 'pending' },
  bookingDuration: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  tenantName: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('PurchasedItem', PurchasedItemSchema);
