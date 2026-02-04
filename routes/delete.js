const express = require("express");
const router = express.Router();

const Transaction = require("../models/Transaction");

// DELETE by transaction_id
router.delete("/delete/:transaction_id", async (req, res) => {
  try {
    const { transaction_id } = req.params;

    const deletedTransaction = await Transaction.findOneAndDelete({
      transaction_id
    });

    if (!deletedTransaction) {
      return res.status(404).json({
        message: "Transaction not found"
      });
    }

    res.status(200).json({
      message: "Transaction deleted successfully",
      data: deletedTransaction
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete transaction",
      error: error.message
    });
  }
});

module.exports = router;
