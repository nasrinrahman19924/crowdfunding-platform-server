const express = require("express");

const {
  createUser,
  getUserProfile,
  getAdminDashboardSummary,
} = require("../controllers/user.controller");

const router = express.Router();

router.post("/", createUser);

router.get("/profile", getUserProfile);
router.get("/admin-summary", getAdminDashboardSummary);

module.exports = router;
