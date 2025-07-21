const mongoose = require('mongoose');
const Room = require('../models/Room');

// POST a new room by landlord
const postRoom = async (req, res) => {
  console.log('postRoom req.user:', req.user);
  try {
    const {
      name,
      lat,
      lon,
      city,
      district,
      ward,
      description,
      price,
      esewaMerchantId,
    } = req.body;

    if (!name || lat == null || lon == null || !esewaMerchantId) {
      return res.status(400).json({
        message: 'Name, coordinates, and eSewa merchant ID are required.',
      });
    }

    const imageUrls = req.files?.map((file) => file.path) || [];

    const newRoom = new Room({
      name,
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
    const ownerId = mongoose.Types.ObjectId(req.user.userID);
    const myRooms = await Room.find({ owner: ownerId }).sort({ createdAt: -1 });
    res.status(200).json(myRooms);
  } catch (err) {
    res.status(500).json({
      message: 'Server error',
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
