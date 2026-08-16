const express = require("express");

const {
  createCampaign,
  getCampaignsByCreator,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getAllCampaigns,
  supportCampaign,
  getMyDonations,
  getCampaignSupporters,
  getAllCampaignsForAdmin,

  // Admin
  getPendingCampaigns,
  approveCampaign,
  rejectCampaign,
} = require("../controllers/campaign.controller");

const router = express.Router();

// Create Campaign
router.post("/", createCampaign);

router.get("/admin/all", getAllCampaignsForAdmin);
// Get approved campaigns for supporters
router.get("/", getAllCampaigns);

// Get creator campaigns
router.get("/creator", getCampaignsByCreator);

// Get supporter donations
router.get("/my-donations", getMyDonations);

// ================================
// Admin Campaign Approval Routes
// ================================

// Get pending campaigns
router.get("/admin/pending", getPendingCampaigns);

// Approve campaign
router.patch("/admin/:id/approve", approveCampaign);

// Reject campaign
router.patch("/admin/:id/reject", rejectCampaign);

// ================================

// Get campaign supporters
router.get("/:id/supporters", getCampaignSupporters);

// Get single campaign
router.get("/:id", getCampaignById);

// Update campaign
router.put("/:id", updateCampaign);

// Delete campaign
router.delete("/:id", deleteCampaign);

// Support campaign
router.post("/:id/support", supportCampaign);

module.exports = router;
