const express = require("express");

const {
  createContribution,
  getMyContributions,
  getSupporterContributionSummary,
} = require("../controllers/contribution.controller");

const router = express.Router();

// Get supporter contribution summary
router.get("/supporter", getSupporterContributionSummary);

// Create contribution
router.post("/", createContribution);

// Get my contributions
router.get("/my-contributions", getMyContributions);

module.exports = router;
