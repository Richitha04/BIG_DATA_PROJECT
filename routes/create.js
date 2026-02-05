const express = require("express");
const router = express.Router();

const Transaction = require("../models/transactions"); 

router.post("/create", async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "Empty request body" });
    }

    if (Array.isArray(req.body)) {
      const transactions = await Transaction.insertMany(req.body, {
        ordered: false
      });

      return res.status(201).json({
        message: "Bulk transactions created successfully",
        count: transactions.length
      });
    }

    // ✅ SINGLE INSERT (object)
    const transaction = await Transaction.create(req.body);

    res.status(201).json({
      message: "Transaction created successfully",
      data: transaction
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to create transaction",
      error: error.message
    });
  }
});

module.exports = router;
