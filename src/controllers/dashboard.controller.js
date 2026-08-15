const { getDB } = require("../db/connectDB");

const getDashboardSummary = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const db = getDB();

    // ========================================
    // 1. Get logged-in user
    // ========================================
    const user = await db.collection("users").findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const role = user.role;

    // ========================================
    // SUPPORTER DASHBOARD
    // ========================================
    if (role === "supporter") {
      const contributions = await db
        .collection("contributions")
        .find({
          supporter_email: email,
        })
        .toArray();

      const totalContributions = contributions.length;

      const totalPendingContributions = contributions.filter(
        (contribution) => contribution.status === "pending",
      ).length;

      const totalAmountContributed = contributions
        .filter((contribution) => contribution.status === "approved")
        .reduce(
          (total, contribution) =>
            total + Number(contribution.contribution_amount || 0),
          0,
        );

      return res.status(200).json({
        success: true,
        role: "supporter",

        summary: {
          credits: Number(user.credits || 0),

          totalContributions,
          totalPendingContributions,
          totalAmountContributed,
        },
      });
    }

    // ========================================
    // CREATOR DASHBOARD
    // ========================================
    if (role === "creator") {
      const campaigns = await db
        .collection("campaigns")
        .find({
          creatorEmail: email,
        })
        .toArray();

      const totalRaised = campaigns.reduce(
        (total, campaign) => total + Number(campaign.raisedAmount || 0),
        0,
      );

      const contributionCount = await db
        .collection("contributions")
        .countDocuments({
          creator_email: email,
        });

      return res.status(200).json({
        success: true,
        role: "creator",

        summary: {
          credits: Number(user.credits || 0),

          campaignCount: campaigns.length,
          totalRaised,
          contributionCount,
        },
      });
    }

    // ========================================
    // ADMIN DASHBOARD
    // ========================================
    if (role === "admin") {
      const totalUsers = await db.collection("users").countDocuments();

      const totalCampaigns = await db.collection("campaigns").countDocuments();

      const pendingCampaigns = await db.collection("campaigns").countDocuments({
        status: "pending",
      });

      const pendingContributions = await db
        .collection("contributions")
        .countDocuments({
          status: "pending",
        });

      const pendingWithdrawals = await db
        .collection("withdrawals")
        .countDocuments({
          status: "pending",
        });

      return res.status(200).json({
        success: true,
        role: "admin",

        summary: {
          totalUsers,
          totalCampaigns,
          pendingCampaigns,
          pendingContributions,
          pendingWithdrawals,
        },
      });
    }

    // ========================================
    // Unknown role
    // ========================================
    return res.status(400).json({
      success: false,
      message: "Invalid user role",
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard summary",
    });
  }
};

module.exports = {
  getDashboardSummary,
};
