const express = require("express");
const router = express.Router();

const Transaction = require("../models/transactions.js");

// GET all transactions
router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ timestamp: -1 });

    res.status(200).json({
      message: "Transactions fetched successfully",
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch transactions",
      error: error.message
    });
  }
});

module.exports = router;
