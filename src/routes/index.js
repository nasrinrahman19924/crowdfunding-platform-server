const express = require("express");

const userRoutes = require("./user.routes");
const campaignRoutes = require("./campaign.routes");
const dashboardRoutes = require("./dashboard.routes");
const withdrawalRoutes = require("./withdrawal.routes");
const contributionRoutes = require("./contribution.routes");

const router = express.Router();

router.use("/users", userRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/withdrawals", withdrawalRoutes);
router.use("/contributions", contributionRoutes);

module.exports = router;
