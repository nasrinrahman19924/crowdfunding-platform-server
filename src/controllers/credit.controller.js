const { getDB } = require("../db/connectDB");

const purchaseCredit = async (req, res) => {
  try {
    const { email, amount } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Validate amount
    const creditAmount = Number(amount);

    if (!Number.isInteger(creditAmount) || creditAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Credit amount must be a positive whole number",
      });
    }

    const db = getDB();

    // Find user
    const user = await db.collection("users").findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Increase user's credits
    const result = await db.collection("users").updateOne(
      {
        _id: user._id,
      },
      {
        $inc: {
          credits: creditAmount,
        },
      },
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to purchase credits",
      });
    }

    // Get updated user
    const updatedUser = await db.collection("users").findOne({
      _id: user._id,
    });

    // Create payment history record
    const payment = {
      userId: user._id,
      email: user.email,
      type: "credit_purchase",
      amount: creditAmount,
      status: "completed",
      createdAt: new Date(),
    };

    await db.collection("payments").insertOne(payment);

    return res.status(200).json({
      success: true,
      message: "Credits purchased successfully",
      credits: updatedUser.credits,
    });
  } catch (error) {
    console.error("Purchase credit error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to purchase credits",
    });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const db = getDB();

    const payments = await db
      .collection("payments")
      .find({ email })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Get payment history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load payment history",
    });
  }
};
module.exports = {
  purchaseCredit,
  getPaymentHistory,
};
