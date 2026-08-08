const { getDB } = require("../db/connectDB");

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

    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

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

    res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: result.insertedId,
    });
  } catch (error) {
    console.error("Create user error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createUser,
};
