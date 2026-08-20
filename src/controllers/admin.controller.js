const { getDB } = require("../db/connectDB");

const getAdminSummary = async (req, res) => {
  try {
    const db = getDB();

    // Total users
    const totalUsers = await db.collection("users").countDocuments();

    // Campaign counts
    const totalCampaigns = await db.collection("campaigns").countDocuments();

    const pendingCampaigns = await db.collection("campaigns").countDocuments({
      status: "pending",
    });

    // Total raised amount
    const raisedResult = await db
      .collection("campaigns")
      .aggregate([
        {
          $group: {
            _id: null,
            totalRaised: {
              $sum: "$raisedAmount",
            },
          },
        },
      ])
      .toArray();

    const totalRaised = raisedResult[0]?.totalRaised || 0;

    // Pending withdrawals
    const pendingWithdrawals = await db
      .collection("withdrawals")
      .countDocuments({
        status: "pending",
      });

    // Pending reports
    const pendingReports = await db.collection("reports").countDocuments({
      status: "pending",
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalUsers,
        totalCampaigns,
        pendingCampaigns,
        totalRaised,
        pendingWithdrawals,
        pendingReports,
      },
    });
  } catch (error) {
    console.error("Get admin summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load admin summary",
    });
  }
};

module.exports = {
  getAdminSummary,
};
