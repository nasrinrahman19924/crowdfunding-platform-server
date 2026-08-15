const { ObjectId } = require("mongodb");
const { getDB } = require("../db/connectDB");

const createWithdrawal = async (req, res) => {
  try {
    const {
      creator_email,
      creator_name,
      withdrawal_credit,
      payment_system,
      account_number,
    } = req.body;

    // Validate required fields
    if (
      !creator_email ||
      !creator_name ||
      !withdrawal_credit ||
      !payment_system ||
      !account_number
    ) {
      return res.status(400).json({
        success: false,
        message: "All withdrawal fields are required",
      });
    }

    const withdrawalCredit = Number(withdrawal_credit);

    // Validate withdrawal credits
    if (!Number.isFinite(withdrawalCredit) || withdrawalCredit <= 0) {
      return res.status(400).json({
        success: false,
        message: "Withdrawal credit must be greater than 0",
      });
    }

    // Minimum withdrawal: 200 credits = $10
    if (withdrawalCredit < 200) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal is 200 credits",
      });
    }

    // Withdrawal credits must be a multiple of 20
    if (withdrawalCredit % 20 !== 0) {
      return res.status(400).json({
        success: false,
        message: "Withdrawal credits must be a multiple of 20",
      });
    }

    const db = getDB();

    // Find creator
    const creator = await db.collection("users").findOne({
      email: creator_email,
      role: "creator",
    });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    // Find all campaigns created by this creator
    const campaigns = await db
      .collection("campaigns")
      .find({
        creatorEmail: creator_email,
      })
      .toArray();

    // Calculate total raised credits
    const totalRaisedCredits = campaigns.reduce(
      (total, campaign) => total + Number(campaign.raisedAmount || 0),
      0,
    );

    // Find previous withdrawals
    const previousWithdrawals = await db
      .collection("withdrawals")
      .find({
        creator_email,
        status: {
          $in: ["pending", "approved", "completed"],
        },
      })
      .toArray();

    // Calculate already withdrawn credits
    const totalWithdrawnCredits = previousWithdrawals.reduce(
      (total, withdrawal) => total + Number(withdrawal.withdrawal_credit || 0),
      0,
    );

    // Calculate available withdrawal credits
    const availableCredits = totalRaisedCredits - totalWithdrawnCredits;

    // Check minimum available credits
    if (availableCredits < 200) {
      return res.status(400).json({
        success: false,
        message: "Insufficient credit",
        totalRaisedCredits,
        totalWithdrawnCredits,
        availableCredits,
      });
    }

    // Check requested credits
    if (withdrawalCredit > availableCredits) {
      return res.status(400).json({
        success: false,
        message: "Withdrawal credit cannot exceed your available credits",
        availableCredits,
      });
    }

    // Calculate withdrawal amount
    // 20 credits = $1
    const withdrawalAmount = withdrawalCredit / 20;

    // Create withdrawal record
    const withdrawal = {
      creator_email,
      creator_name,
      withdrawal_credit: withdrawalCredit,
      withdrawal_amount: withdrawalAmount,
      payment_system,
      account_number,
      withdraw_date: new Date(),
      status: "pending",
    };

    const result = await db.collection("withdrawals").insertOne(withdrawal);

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      withdrawalId: result.insertedId,
      withdrawal,
      totalRaisedCredits,
      totalWithdrawnCredits,
      availableCredits: availableCredits - withdrawalCredit,
    });
  } catch (error) {
    console.error("Create withdrawal error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getWithdrawalSummary = async (req, res) => {
  try {
    const { creator_email } = req.query;

    if (!creator_email) {
      return res.status(400).json({
        success: false,
        message: "Creator email is required",
      });
    }

    const db = getDB();

    // Check creator
    const creator = await db.collection("users").findOne({
      email: creator_email,
      role: "creator",
    });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    // Get all campaigns created by this creator
    const campaigns = await db
      .collection("campaigns")
      .find({
        creatorEmail: creator_email,
      })
      .toArray();

    // Calculate total raised credits
    const totalRaisedCredits = campaigns.reduce(
      (total, campaign) => total + Number(campaign.raisedAmount || 0),
      0,
    );

    // Get all withdrawal history
    const withdrawals = await db
      .collection("withdrawals")
      .find({
        creator_email,
      })
      .sort({
        withdraw_date: -1,
      })
      .toArray();

    // Calculate withdrawn credits
    const totalWithdrawnCredits = withdrawals
      .filter((withdrawal) =>
        ["pending", "approved", "completed"].includes(withdrawal.status),
      )
      .reduce(
        (total, withdrawal) =>
          total + Number(withdrawal.withdrawal_credit || 0),
        0,
      );

    // Calculate available credits
    const availableCredits = Math.max(
      totalRaisedCredits - totalWithdrawnCredits,
      0,
    );

    return res.status(200).json({
      success: true,

      // Summary
      totalRaisedCredits,
      totalWithdrawnCredits,
      availableCredits,

      // Withdrawal history
      withdrawals,
    });
  } catch (error) {
    console.error("Get withdrawal summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load withdrawal summary",
    });
  }
};

const getPendingWithdrawals = async (req, res) => {
  try {
    const db = getDB();

    const withdrawals = await db
      .collection("withdrawals")
      .find({
        status: "pending",
      })
      .sort({
        withdraw_date: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      withdrawals,
    });
  } catch (error) {
    console.error("Get pending withdrawals error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load pending withdrawals",
    });
  }
};

const approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Withdrawal ID is required",
      });
    }

    const db = getDB();

    const withdrawal = await db.collection("withdrawals").findOne({
      _id: new ObjectId(id),
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal request not found",
      });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending withdrawals can be approved",
      });
    }

    const creator = await db.collection("users").findOne({
      email: withdrawal.creator_email,
      role: "creator",
    });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "Creator not found",
      });
    }

    const withdrawalCredit = Number(withdrawal.withdrawal_credit);

    // Calculate creator's total raised credits
    const campaigns = await db
      .collection("campaigns")
      .find({
        creatorEmail: withdrawal.creator_email,
      })
      .toArray();

    const totalRaisedCredits = campaigns.reduce(
      (total, campaign) => total + Number(campaign.raisedAmount || 0),
      0,
    );

    // Calculate previously approved/completed withdrawals
    const previousWithdrawals = await db
      .collection("withdrawals")
      .find({
        creator_email: withdrawal.creator_email,
        status: {
          $in: ["approved", "completed"],
        },
        _id: {
          $ne: new ObjectId(id),
        },
      })
      .toArray();

    const totalWithdrawnCredits = previousWithdrawals.reduce(
      (total, item) => total + Number(item.withdrawal_credit || 0),
      0,
    );

    const availableCredits = totalRaisedCredits - totalWithdrawnCredits;

    if (withdrawalCredit > availableCredits) {
      return res.status(400).json({
        success: false,
        message: "Creator does not have enough available credits",
        availableCredits,
      });
    }

    // Mark withdrawal as approved
    const withdrawalResult = await db.collection("withdrawals").updateOne(
      {
        _id: new ObjectId(id),
        status: "pending",
      },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(),
        },
      },
    );

    if (withdrawalResult.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Withdrawal approval failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Withdrawal approved successfully",
    });
  } catch (error) {
    console.error("Approve withdrawal error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve withdrawal",
    });
  }
};

module.exports = {
  createWithdrawal,
  getWithdrawalSummary,
  getPendingWithdrawals,
  approveWithdrawal,
};
