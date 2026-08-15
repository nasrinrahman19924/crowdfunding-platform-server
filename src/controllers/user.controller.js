const { getDB } = require("../db/connectDB");

// Create user
const createUser = async (req, res) => {
  try {
    const { name, email, role, photo } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email and role are required",
      });
    }

    const db = getDB();

    const existingUser = await db.collection("users").findOne({
      email,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Initial credits
    const initialCredits = role === "supporter" ? 50 : 20;

    const newUser = {
      name,
      email,
      photo: photo || "",
      role,
      credits: initialCredits,
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: result.insertedId,
    });
  } catch (error) {
    console.error("Create user error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const db = getDB();

    const user = await db.collection("users").findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// Get admin dashboard summary
const getAdminDashboardSummary = async (req, res) => {
  try {
    const db = getDB();

    const usersCollection = db.collection("users");
    const paymentsCollection = db.collection("payments");

    const totalSupporters = await usersCollection.countDocuments({
      role: "supporter",
    });

    const totalCreators = await usersCollection.countDocuments({
      role: "creator",
    });

    const creditsResult = await usersCollection
      .aggregate([
        {
          $group: {
            _id: null,
            totalCredits: {
              $sum: "$credits",
            },
          },
        },
      ])
      .toArray();

    const totalAvailableCredits =
      creditsResult.length > 0 ? creditsResult[0].totalCredits : 0;

    const totalPaymentsProcessed = await paymentsCollection.countDocuments({
      status: "completed",
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalSupporters,
        totalCreators,
        totalAvailableCredits,
        totalPaymentsProcessed,
      },
    });
  } catch (error) {
    console.error("Get admin dashboard summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load admin dashboard summary",
    });
  }
};

module.exports = {
  createUser,
  getUserProfile,
  getAdminDashboardSummary,
};
