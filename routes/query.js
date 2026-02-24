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


// 5️⃣ CUSTOM QUERY
// URL: /api/transactions/query/custom
// POST: Execute custom MongoDB queries
router.post("/custom", async (req, res) => {
  try {
    const { query, sort, limit, skip } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    let parsedQuery;
    try {
      parsedQuery = typeof query === 'string' ? JSON.parse(query) : query;
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON in query" });
    }

    let mongoQuery = Transaction.find(parsedQuery);

    // Apply sort if provided
    if (sort) {
      try {
        const parsedSort = typeof sort === 'string' ? JSON.parse(sort) : sort;
        mongoQuery = mongoQuery.sort(parsedSort);
      } catch (err) {
        return res.status(400).json({ error: "Invalid JSON in sort parameter" });
      }
    }

    // Apply limit if provided
    if (limit) {
      mongoQuery = mongoQuery.limit(parseInt(limit));
    }

    // Apply skip if provided
    if (skip) {
      mongoQuery = mongoQuery.skip(parseInt(skip));
    }

    const data = await mongoQuery.exec();

    res.json({
      success: true,
      data: data,
      count: data.length,
      query: parsedQuery
    });

  } catch (err) {
    console.error("Query execution error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to execute query"
    });
  }
});

module.exports = router;
