const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const { getStocks, getSuggestion } = require("./controller/stockcontroller");
const { login ,signin} = require("./controller/userController");
const {connectToMongoose} =require("./connect")

dotenv.config();
const app = express();

// Enable CORS for all origins (development mode)
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// Body parser after CORS
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get("/", (req, res) => {res.json({status: "running"})});

// Login endpoint
app.post("/login", login);
app.post("/signin", signin);
app.post("/analyze", getSuggestion);
app.get("/market-stats",getStocks); 

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message
  });
});

connectToMongoose("mongodb+srv://test-yt:fbpeRfQjLM2RPPO6@travel.oxp093u.mongodb.net/")
.then(()=>console.log("connection successfully"))
.catch(err => console.log("error", err))

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {console.log("✅ Financial AI Backend Server Running")});