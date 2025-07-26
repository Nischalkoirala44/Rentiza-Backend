const express = require('express');
const { postRoom, getRooms, getMyRooms, searchRooms } = require('../controllers/roomController');
const { verifyRole } = require('../middleware/verifyRole.js');
const { authenticateUser } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/multer.js');



const router = express.Router();

router.post("/", authenticateUser, verifyRole(["landlord"]), upload.array('images', 10), postRoom);
router.get("/", getRooms);
router.get("/my-rooms", authenticateUser, verifyRole(["landlord"]), getMyRooms);
router.get("/search", searchRooms);

module.exports = router;