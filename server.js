const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Mongo error:", err));


app.get("/", (req, res) => {
  res.send("Server running successfully");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


const createRoute = require("./routes/create");
const readRoute = require("./routes/read");
const deleteRoute = require("./routes/delete");


app.use("/api/transactions", createRoute);
app.use("/api/transactions", readRoute);
app.use("/api/transactions", deleteRoute);
