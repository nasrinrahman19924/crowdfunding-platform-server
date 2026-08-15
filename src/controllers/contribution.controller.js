const { ObjectId } = require("mongodb");
const { getDB } = require("../db/connectDB");

const createContribution = async (req, res) => {
  try {
    const {
      campaign_id,
      contribution_amount,
      supporter_email,
      supporter_name,
    } = req.body;

    // Validate required fields
    if (
      !campaign_id ||
      !contribution_amount ||
      !supporter_email ||
      !supporter_name
    ) {
      return res.status(400).json({
        success: false,
        message: "Required contribution fields are missing",
      });
    }

    const amount = Number(contribution_amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Contribution amount must be greater than 0",
      });
    }

    // Validate campaign ID
    if (!ObjectId.isValid(campaign_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID",
      });
    }

    const db = getDB();

    // Find campaign
    const campaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(campaign_id),
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Check campaign status
    if (campaign.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This campaign is not active",
      });
    }

    // Check deadline
    if (new Date(campaign.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "This campaign deadline has passed",
      });
    }

    // Find supporter
    const supporter = await db.collection("users").findOne({
      email: supporter_email,
      role: "supporter",
    });

    if (!supporter) {
      return res.status(404).json({
        success: false,
        message: "Supporter not found",
      });
    }

    // Check supporter credits
    if (Number(supporter.credits || 0) < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    // Create contribution
    const contribution = {
      campaign_id: campaign._id,
      campaign_title: campaign.title,
      contribution_amount: amount,
      supporter_email: supporter.email,
      supporter_name: supporter.name,
      creator_name: campaign.creatorName,
      creator_email: campaign.creatorEmail,
      current_date: new Date(),
      status: "pending",
    };

    const result = await db.collection("contributions").insertOne(contribution);

    return res.status(201).json({
      success: true,
      message: "Contribution submitted successfully",
      contributionId: result.insertedId,
      contribution,
    });
  } catch (error) {
    console.error("Create contribution error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getMyContributions = async (req, res) => {
  try {
    const { supporter_email } = req.query;

    if (!supporter_email) {
      return res.status(400).json({
        success: false,
        message: "Supporter email is required",
      });
    }

    const db = getDB();

    const contributions = await db
      .collection("contributions")
      .find({
        supporter_email,
      })
      .sort({
        current_date: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      contributions,
    });
  } catch (error) {
    console.error("Get my contributions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load contributions",
    });
  }
};

const getSupporterContributionSummary = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Supporter email is required",
      });
    }

    const db = getDB();

    // Check supporter
    const supporter = await db.collection("users").findOne({
      email,
      role: "supporter",
    });

    if (!supporter) {
      return res.status(404).json({
        success: false,
        message: "Supporter not found",
      });
    }

    // Get all contributions made by this supporter
    const contributions = await db
      .collection("contributions")
      .find({
        supporter_email: email,
      })
      .sort({ current_date: -1 })
      .toArray();

    // Total contributions
    const totalContributions = contributions.length;

    // Pending contributions
    const totalPendingContributions = contributions.filter(
      (contribution) => contribution.status === "pending",
    ).length;

    // Approved contribution amount
    const totalAmountContributed = contributions
      .filter((contribution) => contribution.status === "approved")
      .reduce(
        (total, contribution) =>
          total + Number(contribution.contribution_amount || 0),
        0,
      );

    return res.status(200).json({
      success: true,
      totalContributions,
      totalPendingContributions,
      totalAmountContributed,
      contributions,
    });
  } catch (error) {
    console.error("Get supporter contribution summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load contribution summary",
    });
  }
};

module.exports = {
  createContribution,
  getMyContributions,
  getSupporterContributionSummary,
};
