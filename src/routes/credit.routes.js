const express = require("express");

const { purchaseCredit,
    getPaymentHistory,
 } = require("../controllers/credit.controller");

const router = express.Router();

router.post("/purchase", purchaseCredit);
router.get("/payments", getPaymentHistory);

module.exports = router;