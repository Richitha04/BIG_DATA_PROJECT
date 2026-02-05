const express = require("express");
const router = express.Router();
const Transaction = require("../models/transactions");

router.get("/user/:username", async (req, res) => {
  try {
    const username = req.params.username;

    const result = await Transaction.aggregate([
      {
        $match: {
          from_user: username
        }
      },
      {
        $project: {
          _id: 0,
          transaction_id: 1,
          from_user: 1,
          to_user: 1,
          amount: 1,
          timestamp: 1
        }
      },
      {
        $sort: { timestamp: -1 }
      }
    ]);

    res.json({
      user: username,
      totalTransactions: result.length,
      transactions: result
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
