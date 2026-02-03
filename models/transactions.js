const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
    required: true,
    unique: true
  },

  from_user: {
    type: String,
    required: true
  },

  to_user: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Transaction", transactionSchema);
