import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();

// ========================================
// MIDDLEWARE - CORS MUST BE FIRST!
// ========================================

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

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = process.env.OPENROUTER_API_KEY;

// Helper: try to extract and parse JSON safely from model output
function safeParseJSON(text) {
  if (!text || typeof text !== "string") throw new Error("No text to parse");

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) { }

  // Try to find largest {...} block
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      // fallthrough
    }
  }

  // Try to extract code fence JSON ```json ... ```
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (e) { }
  }

  // As last resort, try to find a JSON array or object by regex
  const objMatch = text.match(/(\{[\s\S]*\})/);
  if (objMatch && objMatch[1]) {
    try {
      return JSON.parse(objMatch[1]);
    } catch (e) { }
  }

  throw new Error("Unable to parse JSON from model output.");
}

// ========================================
// ROUTES
// ========================================

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "running",
    message: "Financial AI Backend API",
    endpoints: {
      marketStats: "GET /market-stats",
      analyze: "POST /analyze"
    }
  });
});

// POST /analyze
app.post("/analyze", async (req, res) => {
  console.log("📊 Analyze request received");
  console.log("Request body:", req.body);

  try {
    const { price, risk, investmentType, duration } = req.body;

    if (!price || !risk || !investmentType || !duration) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ error: "All fields are required." });
    }

    const prompt = `
You are a financial advisor. Based on:
- Investment: ₹${price}
- Risk level: ${risk} (1=Low, 5=High)
- Investment type: ${investmentType}
- Time duration: ${duration}
Suggest 5 investments with:
- name
- description
- current_price
- sell_price
- stop_loss

Return strictly valid JSON only, in this shape:
{
  "suggestions": [
    { "name": "", "description": "", "current_price": "", "sell_price": "", "stop_loss": "" }
  ]
}
`;

    console.log("🤖 Calling AI model...");
    const response = await axios.post(
      API_URL,
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const output = response.data?.choices?.[0]?.message?.content;
    if (!output) {
      console.log("❌ No content returned from model");
      throw new Error("No content returned from model");
    }

    console.log("✅ AI response received");

    let parsed;
    try {
      parsed = safeParseJSON(output.replace(/```json|```/g, "").trim());
    } catch (err) {
      console.error("❌ JSON parse error (analyze):", err.message, "\nRaw output:", output);
      return res.status(500).json({ error: "Model returned unparsable JSON." });
    }

    console.log("✅ Sending analysis response");
    res.json(parsed);
  } catch (error) {
    console.error("❌ Error (analyze):", error.response?.data || error.message);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// GET /market-stats
app.get("/market-stats", async (req, res) => {
  console.log("📈 Market stats request received");

  try {
    const prompt = `
Provide the current market summary for these indices/commodities:
- Nifty50
- Sensex
- Bank Nifty
- Gold (1g)
- Silver (1kg)
- Crude Oil (per barrel)
- USD/INR exchange rate

For each item include: name, current (numeric), change (absolute numeric), change_pct (numeric)
Return strictly valid JSON only in this exact shape:
{
  "indices": [
    { "name": "Nifty50", "current": 0, "change": 0, "change_pct": 0 }
  ]
}
Use numbers only for numeric fields (no commas). Do not include extra commentary.
`;

    console.log("🤖 Calling AI model for market data...");
    const response = await axios.post(
      API_URL,
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const output = response.data?.choices?.[0]?.message?.content;
    if (!output) {
      console.log("❌ No content returned from model");
      throw new Error("No content returned from model");
    }

    console.log("✅ AI response received");

    let parsed;
    try {
      parsed = safeParseJSON(output.replace(/```json|```/g, "").trim());
    } catch (err) {
      console.error("❌ JSON parse error (market-stats):", err.message, "\nRaw output:", output);
      return res.status(500).json({ error: "Model returned unparsable JSON." });
    }

    console.log("✅ Sending market stats response");
    res.json(parsed);
  } catch (error) {
    console.error("❌ Error (market-stats):", error.response?.data || error.message);
    res.status(500).json({ error: "Unable to generate market stats." });
  }
});

// ========================================
// ERROR HANDLERS
// ========================================

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

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("✅ Financial AI Backend Server Running");
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📈 Market Stats: GET http://localhost:${PORT}/market-stats`);
  console.log(`📊 Analyze: POST http://localhost:${PORT}/analyze`);
});