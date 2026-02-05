const express = require("express");
const router = express.Router();
const Transaction = require("../models/transactions");


// 1️⃣ SORT transactions by amount
// URL: /api/transactions/query/sort
router.get("/sort", async (req, res) => {
  try {
    const data = await Transaction.find().sort({ amount: 1 }); // 1 = ascending
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 2️⃣ AND QUERY
// Example: from_user = User1 AND amount > 3000
// URL: /api/transactions/query/and
router.get("/and", async (req, res) => {
  try {
    const data = await Transaction.find({
      from_user: "User1",
      amount: { $gt: 3000 }
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 3️⃣ OR QUERY
// Example: from_user = User2 OR to_user = User2
// URL: /api/transactions/query/or
router.get("/or", async (req, res) => {
  try {
    const data = await Transaction.find({
      $or: [
        { from_user: "User2" },
        { to_user: "User2" }
      ]
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 4️⃣ LIMIT
// URL: /api/transactions/query/limit
router.get("/limit", async (req, res) => {
  try {
    const data = await Transaction.find().limit(5);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
