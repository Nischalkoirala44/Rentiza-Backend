const mongoose = require('mongoose');
const Room = require('../models/Room');
const PurchasedItem = require('../models/PurchasedItem');

const postRoom = async (req, res) => {
  try {
    const {
      name,
      phone,
      lat,
      lon,
      city,
      district,
      ward,
      description,
      price,
      esewaMerchantId,
    } = req.body;

    if (!name || lat == null || lon == null || !esewaMerchantId || !phone == null) {
      return res.status(400).json({
        message: 'Name, coordinates, and eSewa merchant ID are required.',
      });
    }

    const imageUrls = req.files?.map((file) => file.path) || [];

    const newRoom = new Room({
      name,
      phone,
      lat,
      lon,
      city,
      district,
      ward,
      description,
      price,
      images: imageUrls,
      owner: req.user.userID,
      status: 'pending',
      esewaMerchantId,
      isAvailable: true,
    });

    await newRoom.save();

    res.status(201).json({
      message: 'Room posted successfully!',
      data: newRoom,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Server error',
      error: err.message,
    });
  }
};

// GET all rooms
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    res.status(200).json(rooms);
  } catch (err) {
    res.status(500).json({
      message: 'Server error',
      error: err.message,
    });
  }
};

// GET rooms posted by logged-in user
const getMyRooms = async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.userID);

    // Fetch all rooms posted by this owner
    const myRooms = await Room.find({ owner: ownerId }).sort({ createdAt: -1 });

    const roomsWithBookingDetails = await Promise.all(
      myRooms.map(async (room) => {
        const purchasedItem = await PurchasedItem.findOne({
          location: room._id,
          status: "completed",
        }).select("bookingDuration tenantName")
          .sort({ "bookingDuration.startDate": -1 });

        return {
          ...room.toObject(),
          bookingDuration: purchasedItem ? purchasedItem.bookingDuration : null,
          tenantName: purchasedItem ? purchasedItem.tenantName : null,
        };
        
      })
    
    );

    res.status(200).json(roomsWithBookingDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};


// Export all controllers
module.exports = {
  postRoom,
  getRooms,
  getMyRooms,
};
