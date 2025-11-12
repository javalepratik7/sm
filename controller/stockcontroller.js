const axios = require("axios");
const dotenv = require("dotenv");
const {verifyToken} =require("../services/Services")

dotenv.config();

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

async function getStocks(req, res) {
    const token = req.headers['authorization']?.split(' ')[1];

    const responce=onlyLogin(token)
    if (!responce) {
        return res.status(200).json({message:"please login first"})
    }

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
            throw new Error("No content returned from model");
        }

        let parsed;
        try {
            parsed = safeParseJSON(output.replace(/```json|```/g, "").trim());
        } catch (err) {
            return res.status(500).json({ error: "Model returned unparsable JSON." });
        }

        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: "Unable to generate market stats." });
    }
}

async function getSuggestion(req, res) {
    const token = req.headers['authorization']?.split(' ')[1];

    const responce=onlyLogin(token)
    if (!responce) {
        return res.status(200).json({message:"please login first"})
    }

    try {
        const { price, risk, investmentType, duration } = req.body;

        if (!price || !risk || !investmentType || !duration) {
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
            throw new Error("No content returned from model");
        }

        let parsed;
        try {
            parsed = safeParseJSON(output.replace(/```json|```/g, "").trim());
        } catch (err) {
            return res.status(500).json({ error: "Model returned unparsable JSON." });
        }
        res.json(parsed);
    } catch (error) {
        res.status(500).json({ error: "Something went wrong." });
    }
}

function onlyLogin(cookie) {
    if(!cookie){
        return false
    }
    const payload=verifyToken(cookie)
    if (!payload || payload == "Invalid or expired token" ) {
       return false
    }
    return true
}


module.exports = { getStocks, getSuggestion };