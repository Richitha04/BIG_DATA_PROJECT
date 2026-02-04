const express = require("express");
const router = express.Router();

const Transaction = require("../models/transactions.js"); // adjust path if needed

// POST /transaction/create
router.post("/create", async (req, res) => {
  try {
    const { transaction_id, from_user, to_user, amount } = req.body;

    const transaction = new Transaction({
      transaction_id,
      from_user,
      to_user,
      amount
    });

    const savedTransaction = await transaction.save();

    res.status(201).json({
      message: "Transaction created successfully",
      data: savedTransaction
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create transaction",
      error: error.message
    });
  }
});

module.exports = router;
