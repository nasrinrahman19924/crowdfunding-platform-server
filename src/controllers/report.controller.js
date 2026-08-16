const { ObjectId } = require("mongodb");
const { getDB } = require("../db/connectDB");

// ========================================
// CREATE CAMPAIGN REPORT
// ========================================
const createReport = async (req, res) => {
  try {
    const { campaignId, reporterName, reporterEmail, reason } = req.body;

    if (!campaignId || !reporterName || !reporterEmail || !reason) {
      return res.status(400).json({
        success: false,
        message: "All report fields are required",
      });
    }

    const db = getDB();

    // Check campaign exists
    const campaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(campaignId),
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Prevent duplicate report from same supporter
    const existingReport = await db.collection("reports").findOne({
      campaignId: new ObjectId(campaignId),
      reporterEmail,
    });

    if (existingReport) {
      return res.status(409).json({
        success: false,
        message: "You have already reported this campaign",
      });
    }

    const report = {
      campaignId: new ObjectId(campaignId),
      reporterName,
      reporterEmail,
      campaignTitle: campaign.title,
      reason,
      status: "pending",
      createdAt: new Date(),
    };

    const result = await db.collection("reports").insertOne(report);

    return res.status(201).json({
      success: true,
      message: "Campaign reported successfully",
      reportId: result.insertedId,
    });
  } catch (error) {
    console.error("Create report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit report",
    });
  }
};

// ========================================
// GET ALL REPORTS FOR ADMIN
// ========================================
const getAllReports = async (req, res) => {
  try {
    const db = getDB();

    const reports = await db
      .collection("reports")
      .find({})
      .sort({
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Get reports error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load reports",
    });
  }
};

// ========================================
// SUSPEND REPORTED CAMPAIGN
// ========================================
const suspendCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID is required",
      });
    }

    const db = getDB();

    const campaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(id),
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const result = await db.collection("campaigns").updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: "suspended",
          suspendedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Campaign suspension failed",
      });
    }

    // Update related reports
    await db.collection("reports").updateMany(
      {
        campaignId: new ObjectId(id),
        status: "pending",
      },
      {
        $set: {
          status: "reviewed",
          action: "suspended",
          reviewedAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Campaign suspended successfully",
    });
  } catch (error) {
    console.error("Suspend campaign error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to suspend campaign",
    });
  }
};

// ========================================
// DELETE REPORTED CAMPAIGN
// ========================================
const deleteReportedCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID is required",
      });
    }

    const db = getDB();

    const campaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(id),
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const result = await db.collection("campaigns").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Campaign could not be deleted",
      });
    }

    // Update related reports
    await db.collection("reports").updateMany(
      {
        campaignId: new ObjectId(id),
        status: "pending",
      },
      {
        $set: {
          status: "reviewed",
          action: "deleted",
          reviewedAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Reported campaign deleted successfully",
    });
  } catch (error) {
    console.error("Delete reported campaign error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete campaign",
    });
  }
};
// ========================================
// GET REPORT STATISTICS FOR ADMIN
// ========================================
const getReportStats = async (req, res) => {
  try {
    const db = getDB();

    const totalReports = await db.collection("reports").countDocuments({});

    const pendingReports = await db.collection("reports").countDocuments({
      status: "pending",
    });

    const reviewedReports = await db.collection("reports").countDocuments({
      status: "reviewed",
    });

    return res.status(200).json({
      success: true,
      totalReports,
      pendingReports,
      reviewedReports,
    });
  } catch (error) {
    console.error("Get report stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load report statistics",
    });
  }
};

// ========================================
// MARK REPORT AS REVIEWED
// ========================================
const reviewReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid report ID is required",
      });
    }

    const db = getDB();

    const report = await db.collection("reports").findOne({
      _id: new ObjectId(id),
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    if (report.status === "reviewed") {
      return res.status(400).json({
        success: false,
        message: "Report is already reviewed",
      });
    }

    const result = await db.collection("reports").updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: "reviewed",
          reviewedAt: new Date(),
          action: "reviewed",
        },
      },
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to review report",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report marked as reviewed",
    });
  } catch (error) {
    console.error("Review report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to review report",
    });
  }
};

module.exports = {
  createReport,
  getAllReports,
  suspendCampaign,
  deleteReportedCampaign,
  getReportStats,
  reviewReport,
};
