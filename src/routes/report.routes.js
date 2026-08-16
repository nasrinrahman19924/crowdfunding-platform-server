const express = require("express");

const {
  createReport,
  getAllReports,
  suspendCampaign,
  deleteReportedCampaign,
  getReportStats,
  reviewReport,
} = require("../controllers/report.controller");

const router = express.Router();

// ========================================
// Supporter
// ========================================
router.post("/", createReport);

// ========================================
// Admin
// ========================================

// Get all reports
router.get("/", getAllReports);

// Get report statistics
router.get("/stats", getReportStats);

// Mark report as reviewed
router.patch("/:id/review", reviewReport);

// Suspend reported campaign
router.patch("/campaign/:id/suspend", suspendCampaign);

// Delete reported campaign
router.delete("/campaign/:id", deleteReportedCampaign);

module.exports = router;