const express = require("express");

const {
  createWithdrawal,
  getWithdrawalSummary,
  getPendingWithdrawals,
  approveWithdrawal,
} = require("../controllers/withdrawal.controller");

const router = express.Router();

// Creator
router.get("/", getWithdrawalSummary);
router.post("/", createWithdrawal);

// Admin
router.get("/pending", getPendingWithdrawals);
router.patch("/:id/approve", approveWithdrawal);

module.exports = router;
