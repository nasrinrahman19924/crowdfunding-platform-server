const express = require("express");

const {
  createUser,
  getUserProfile,
  getAdminDashboardSummary,
  getAllUsers,
  updateUserRole,
  deleteUser,
} = require("../controllers/user.controller");

const router = express.Router();

router.post("/", createUser);

router.get("/profile", getUserProfile);
router.get("/admin-summary", getAdminDashboardSummary);
// Admin - Get all users
router.get("/admin/all", getAllUsers);
// Admin - Update user role
router.patch("/admin/:id/role", updateUserRole);
// Admin - Delete user
router.delete("/admin/:id", deleteUser);
module.exports = router;
