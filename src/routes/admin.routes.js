const express = require("express");

const { getAdminSummary } = require("../controllers/admin.controller");

const router = express.Router();

router.get("/summary", getAdminSummary);

module.exports = router;
