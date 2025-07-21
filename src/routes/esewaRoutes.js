const express = require('express');
const { authenticateUser } = require('../middleware/authMiddleware');
const { verifyRole } = require('../middleware/verifyRole');
const eSewaController = require('../controllers/esewaController');

const router = express.Router();

router.post('/initialize-esewa', authenticateUser, verifyRole(['tenant']), eSewaController.initializeEsewaPayment);
router.get('/complete-payment', eSewaController.completeEsewaPayment);

module.exports = router;
