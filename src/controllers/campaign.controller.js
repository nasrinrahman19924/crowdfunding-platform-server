const { ObjectId } = require("mongodb");
const { getDB } = require("../db/connectDB");

const createCampaign = async (req, res) => {
  try {
    const {
      title,
      description,
      image,
      category,
      goalAmount,
      deadline,
    } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      !goalAmount ||
      !deadline
    ) {
      return res.status(400).json({
        success: false,
        message: "Required campaign fields are missing",
      });
    }

    const db = getDB();

    const user = await db.collection("users").findOne({
      email: req.user.email,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newCampaign = {
      title,
      description,
      image: image || "",
      category,
      goalAmount: Number(goalAmount),
      deadline: new Date(deadline),

      // 🔐 Identity comes from authenticated user
      creatorEmail: user.email,
      creatorName: user.name,

      status: "pending",
      raisedAmount: 0,
      createdAt: new Date(),
    };

    const result = await db.collection("campaigns").insertOne(newCampaign);

    return res.status(201).json({
      success: true,
      message: "Campaign created successfully",
      campaignId: result.insertedId,
    });
  } catch (error) {
    console.error("Create campaign error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getCampaignsByCreator = async (req, res) => {
  try {
    const { creatorEmail } = req.query;

    if (!creatorEmail) {
      return res.status(400).json({
        success: false,
        message: "Creator email is required",
      });
    }

    const db = getDB();

    const campaigns = await db
      .collection("campaigns")
      .find({ creatorEmail })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Get campaigns error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getAllCampaigns = async (req, res) => {
  try {
    const db = getDB();

    const campaigns = await db
      .collection("campaigns")
      .find({
        status: "approved",
        deadline: {
          $gte: new Date(),
        },
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.status(200).json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Get all campaigns error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load campaigns",
    });
  }
};

const getCampaignById = async (req, res) => {
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

    res.status(200).json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("Get campaign by ID error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    const { title, description, image, category, goalAmount, deadline } =
      req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID is required",
      });
    }

    if (!title || !description || !category || !goalAmount || !deadline) {
      return res.status(400).json({
        success: false,
        message: "Required campaign fields are missing",
      });
    }

    const db = getDB();

    const existingCampaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(id),
    });

    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const updatedCampaign = {
      title,
      description,
      image: image || "",
      category,
      goalAmount: Number(goalAmount),
      deadline: new Date(deadline),
      updatedAt: new Date(),
    };

    const result = await db.collection("campaigns").updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updatedCampaign,
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const campaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(id),
    });

    res.status(200).json({
      success: true,
      message: "Campaign updated successfully",
      campaign,
    });
  } catch (error) {
    console.error("Update campaign error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID is required",
      });
    }

    const db = getDB();

    const existingCampaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(id),
    });

    if (!existingCampaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }
    if (existingCampaign.creatorEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to edit this campaign",
      });
    }

    const result = await db.collection("campaigns").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign could not be deleted",
      });
    }

    res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("Delete campaign error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const supportCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { supporterEmail, amount } = req.body;

    // 1. Validate campaign ID
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID is required",
      });
    }

    // 2. Validate supporter email
    if (!supporterEmail) {
      return res.status(400).json({
        success: false,
        message: "Supporter email is required",
      });
    }

    // 3. Validate amount
    const supportAmount = Number(amount);

    if (!supportAmount || supportAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Support amount must be greater than 0",
      });
    }

    const db = getDB();

    // 4. Find campaign
    const campaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(id),
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // 5. Check campaign status
    if (campaign.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This campaign is not active",
      });
    }

    // 6. Check campaign goal
    if (campaign.raisedAmount >= campaign.goalAmount) {
      return res.status(400).json({
        success: false,
        message: "Campaign goal has already been reached",
      });
    }

    // 7. Find supporter
    const supporter = await db.collection("users").findOne({
      email: supporterEmail,
    });

    if (!supporter) {
      return res.status(404).json({
        success: false,
        message: "Supporter not found",
      });
    }

    // 8. Check supporter credits
    if (supporter.credits < supportAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
      });
    }

    // 9. Prevent supporting beyond campaign goal
    const remainingAmount = campaign.goalAmount - campaign.raisedAmount;

    if (supportAmount > remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Maximum support amount is ${remainingAmount}`,
      });
    }

    // 10. Deduct supporter credits
    await db.collection("users").updateOne(
      {
        _id: supporter._id,
      },
      {
        $inc: {
          credits: -supportAmount,
        },
      },
    );

    // 11. Increase campaign raised amount
    await db.collection("campaigns").updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $inc: {
          raisedAmount: supportAmount,
        },
      },
    );

    // 12. Create donation record
    const donation = {
      campaignId: new ObjectId(id),
      supporterEmail: supporter.email,
      supporterName: supporter.name,
      amount: supportAmount,
      createdAt: new Date(),
    };

    await db.collection("donations").insertOne(donation);

    // 13. Get updated campaign
    const updatedCampaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(id),
    });

    // 14. Get updated supporter
    const updatedSupporter = await db.collection("users").findOne({
      _id: supporter._id,
    });

    return res.status(200).json({
      success: true,
      message: "Campaign supported successfully",
      campaign: updatedCampaign,
      credits: updatedSupporter.credits,
    });
  } catch (error) {
    console.error("Support campaign error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getMyDonations = async (req, res) => {
  try {
    const { supporterEmail } = req.query;

    if (!supporterEmail) {
      return res.status(400).json({
        success: false,
        message: "Supporter email is required",
      });
    }

    const db = getDB();

    const donations = await db
      .collection("donations")
      .find({
        supporterEmail,
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    const donationsWithCampaign = await Promise.all(
      donations.map(async (donation) => {
        const campaign = await db.collection("campaigns").findOne({
          _id: new ObjectId(donation.campaignId),
        });

        return {
          ...donation,
          campaign: campaign
            ? {
                _id: campaign._id,
                title: campaign.title,
                image: campaign.image,
                category: campaign.category,
              }
            : null,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      donations: donationsWithCampaign,
    });
  } catch (error) {
    console.error("Get my donations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load donation history",
    });
  }
};

const updateCampaignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID is required",
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign status",
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

    if (campaign.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending campaigns can be reviewed",
      });
    }

    const result = await db.collection("campaigns").updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status,
          reviewedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to update campaign status",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Campaign approved successfully"
          : "Campaign rejected successfully",
    });
  } catch (error) {
    console.error("Update campaign status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update campaign status",
    });
  }
};

const getCampaignSupporters = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Campaign ID is required",
      });
    }

    const db = getDB();

    // Check campaign exists
    const campaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(id),
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    // Get donations for this campaign
    const donations = await db
      .collection("donations")
      .find({
        campaignId: new ObjectId(id),
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      campaign: {
        _id: campaign._id,
        title: campaign.title,
        raisedAmount: campaign.raisedAmount,
        goalAmount: campaign.goalAmount,
      },
      supporters: donations,
    });
  } catch (error) {
    console.error("Get campaign supporters error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load campaign supporters",
    });
  }
};
const getPendingCampaigns = async (req, res) => {
  try {
    const db = getDB();

    const campaigns = await db
      .collection("campaigns")
      .find({
        status: "pending",
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    return res.status(200).json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Get pending campaigns error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load pending campaigns",
    });
  }
};

const approveCampaign = async (req, res) => {
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

    if (campaign.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending campaigns can be approved",
      });
    }

    const result = await db.collection("campaigns").updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Campaign approval failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Campaign approved successfully",
    });
  } catch (error) {
    console.error("Approve campaign error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve campaign",
    });
  }
};

const rejectCampaign = async (req, res) => {
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

    if (campaign.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending campaigns can be rejected",
      });
    }

    const result = await db.collection("campaigns").updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Campaign rejection failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Campaign rejected successfully",
    });
  } catch (error) {
    console.error("Reject campaign error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject campaign",
    });
  }
};
const getAllCampaignsForAdmin = async (req, res) => {
  try {
    const db = getDB();
    const campaigns = await db
      .collection("campaigns")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return res.status(200).json({ success: true, campaigns });
  } catch (error) {
    console.error("Get all campaigns for admin error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load campaigns" });
  }
};

module.exports = {
  createCampaign,
  getAllCampaigns,
  getCampaignsByCreator,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  supportCampaign,
  getMyDonations,
  getCampaignSupporters,

  // Admin
  getPendingCampaigns,
  updateCampaignStatus,
  approveCampaign,
  rejectCampaign,
  getAllCampaignsForAdmin,
};
