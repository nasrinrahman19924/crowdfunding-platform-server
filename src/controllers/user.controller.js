const { ObjectId } = require("mongodb");
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

// Get all users - Admin
const getAllUsers = async (req, res) => {
  try {
    const db = getDB();

    const users = await db
      .collection("users")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load users",
    });
  }
};

// Update user role - Admin
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const allowedRoles = ["admin", "creator", "supporter"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    const db = getDB();

    const user = await db.collection("users").findOne({
      _id: new ObjectId(id),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const result = await db.collection("users").updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          role,
          updatedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Role was not changed",
      });
    }

    const updatedUser = await db.collection("users").findOne({
      _id: new ObjectId(id),
    });

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user role error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user role",
    });
  }
};

// Delete user - Admin
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const db = getDB();

    const user = await db.collection("users").findOne({
      _id: new ObjectId(id),
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const result = await db.collection("users").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "User could not be deleted",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

module.exports = {
  createUser,
  getUserProfile,
  getAdminDashboardSummary,
  // Admin
   getAllUsers, 
   updateUserRole,
    deleteUser,
};
