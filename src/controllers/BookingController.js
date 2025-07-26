const PurchasedItem = require("../models/PurchasedItem");
const Booking = require("../models/Booking");
const Location = require("../models/Room");
const UserData = require("../models/User");

exports.bookCashPayment = async (req, res) => {
  try {
    const { locationId, totalPrice, tenantName, phone, startDate, endDate } =
      req.body;
    const userId = req.user.userID;

    if (!startDate || !endDate || new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "Invalid booking duration" });
    }
    if (!locationId || !totalPrice) {
      return res
        .status(400)
        .json({ message: "locationId and totalPrice are required" });
    }

    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(400).json({ message: "Location not found" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const expectedTotal = Number(location.price) * days;

    if (Number(totalPrice) !== expectedTotal) {
      return res.status(400).json({ message: "Price mismatch" });
    }

    if (!location.isAvailable) {
      return res.status(400).json({ message: "Location is not available" });
    }

    const now = new Date();

    const alreadyPurchased = await PurchasedItem.findOne({
      user: userId,
      location: locationId,
      status: { $in: ["pending", "completed"] },
      isAvailable: false,
      "bookingDuration.endDate": { $gt: now },
    });

    if (alreadyPurchased) {
      return res.status(400).json({
        success: false,
        message:
          "You have already booked this location and your booking has not ended yet.",
      });
    }

    if (tenantName && phone) {
      await UserData.findByIdAndUpdate(userId, {
        name: tenantName,
        mobile: phone,
      });
    }

    // Create PurchasedItem record
    const purchasedItem = await PurchasedItem.create({
      user: userId,
      location: locationId,
      paymentMethod: "cash",
      totalPrice: totalPrice.toString(),
      status: "awaiting_approval",
      bookingDuration: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      tenantName,
    });

    // Create Booking record
    const booking = await Booking.create({
      user: userId,
      location: locationId,
      amount: Number(totalPrice),
      paymentMethod: "cash",
      paymentStatus: "pending_approval",
      bookingDuration: purchasedItem.bookingDuration,
      tenantName,
    });

    res.status(201).json({
      message: "Room booking request submitted. Awaiting landlord approval.",
      booking,
    });
  } catch (error) {
    console.error("Error in bookCashPayment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getPendingCashBookings = async (req, res) => {
  try {
    const pendingBookings = await Booking.find({
      paymentMethod: "cash",
      paymentStatus: "pending_approval",
    })
      .populate("user location")
      .sort({ createdAt: -1 });

    res.json({ success: true, pendingBookings });
  } catch (error) {
    console.error("Error fetching pending cash bookings:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.approveCashBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (
      !booking ||
      booking.paymentMethod !== "cash" ||
      booking.paymentStatus !== "pending_approval"
    ) {
      return res
        .status(404)
        .json({ message: "Booking not found or not pending approval" });
    }

    booking.paymentStatus = "success";
    await booking.save();

    await PurchasedItem.findOneAndUpdate(
      {
        user: booking.user,
        location: booking.location,
        status: "awaiting_approval",
      },
      { status: "completed" }
    );

    await Location.findByIdAndUpdate(booking.location, { isAvailable: false });

    res.json({
      message: "Booking approved and room marked unavailable",
      booking,
    });
  } catch (error) {
    console.error("Error approving booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.rejectCashBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (
      !booking ||
      booking.paymentMethod !== "cash" ||
      booking.paymentStatus !== "pending_approval"
    ) {
      return res
        .status(404)
        .json({ message: "Booking not found or not pending approval" });
    }

    booking.paymentStatus = "failed";
    await booking.save();

    await PurchasedItem.findOneAndUpdate(
      {
        user: booking.user,
        location: booking.location,
        status: "awaiting_approval",
      },
      { status: "failed" }
    );

    res.json({ message: "Booking rejected by landlord", booking });
  } catch (error) {
    console.error("Error rejecting booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.setRoomAvailable = async (req, res) => {
  try {
    const locations = await Location.find({ isAvailable: false });
    const now = new Date();

    for (const location of locations) {
      const purchasedItem = await PurchasedItem.findOne({
        location: location._id,
        status: "completed",
      });

      if (
        purchasedItem &&
        new Date(purchasedItem.bookingDuration.endDate) <= now
      ) {
        await Location.updateOne(
          { _id: location._id },
          { $set: { isAvailable: true } }
        );
      }
    }

    res.json({ success: true, message: "Locations availability updated" });
    console.log("Locations availability updated successfully");
  } catch (error) {
    console.error("Error updating location availability:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};


exports.getTenantBookings = async (req, res) => {
  try {
    const userId = req.user.userID;

    let bookings = await PurchasedItem.find({ user: userId })
      .populate("location")
      .sort({ createdAt: -1 });

    const filteredBookings = [];

    for (const booking of bookings) {
      if (
        booking.status === "completed" &&
        booking.location &&
        booking.location.isAvailable === false
      ) {
        filteredBookings.push(booking);
      }
    }

    console.log("Filtered bookings:", filteredBookings.length);

    if (filteredBookings.length === 0) {
      return res.status(200).json({
        success: true,
        bookings: [],
      });
    }

    res.json({ success: true, bookings: filteredBookings });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getLandlordBookings = async (req, res) => {
  try {
    const landlordId = req.user.userID;

    const landlordRooms = await Location.find({ owner: landlordId }).select("_id");

    if (!landlordRooms || landlordRooms.length === 0) {
      return res.status(200).json({ success: true, bookings: [] });
    }

    const roomIds = landlordRooms.map((room) => room._id);

    // Fetch all bookings for landlord rooms
    let bookings = await Booking.find({ location: { $in: roomIds } })
      .populate("user", "name email mobile")
      .populate("location", "title price isAvailable images phone city")
      .sort({ createdAt: -1 });

    // Filter bookings based on condition
    const filteredBookings = [];
    for (const booking of bookings) {
      if (booking.location && booking.location.isAvailable === false) {
        filteredBookings.push({
          ...booking._doc,
          totalPrice: booking.amount, // alias for consistency
        });
      }
    }

    return res.json({ success: true, bookings: filteredBookings });
  } catch (error) {
    console.error("Error fetching landlord bookings:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
