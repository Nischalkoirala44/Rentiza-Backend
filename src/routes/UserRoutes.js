const express  = require('express');

const { getUserDetails } = require('../controllers/UserController.js');
const { authenticateUser } = require('../middleware/authMiddleware.js');
const { registerUser } = require('../controllers/UserController.js');

const router=express.Router();

router.post("/register",registerUser);

router.get("/getUserDetails", authenticateUser, getUserDetails);

module.exports = router;