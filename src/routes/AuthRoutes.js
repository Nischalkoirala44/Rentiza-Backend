const express = require('express');

const { forgotPassword, loginUser, logout, resetPassword } = require('../controllers/AuthController.js');
const { verifyRole } = require('../middleware/verifyRole.js');
const { authenticateUser } = require('../middleware/AuthMiddleware.js');

const router = express.Router();

router.post("/logout", logout);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get(
  "/dashboard/landlord",
  authenticateUser,
  verifyRole(["landlord"]),
  (req, res) => {
    res.json({ message: "Welcome Landlord!" });
  }
);

router.get(
  "/dashboard/tenant",
  authenticateUser,
  verifyRole(["tenant"]),
  (req, res) => {
    res.json({ message: "Welcome Tenant!" });
  }
);

module.exports = router;
