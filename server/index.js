const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());
const PORT = 5000;

// Your Gemini API Key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function buildPrompt(userText) {
  return `
You are an expert in database ER diagrams following Chen notation. Extract all entities, attributes, relationships, and cardinalities from the user's text.

Follow these specific rules:
1.  **Primary Keys:** For each entity, identify the primary key attribute and prefix its name with "PK_".
2.  **Multi-valued Attributes:** Identify attributes that can have multiple values and prefix their names with "MV_".
3.  **Derived Attributes:** Identify attributes that can be derived from others and prefix their names with "DA_".
4.  **Composite Attributes:** If an attribute is composed of several parts (like an address), create a main attribute and list its parts in a "components" array. 
   Example: 
   {"entity": "Employee", "attribute": "address", "components": ["street", "city", "zip"]}
5.  **Weak Entities:** Identify any weak entities and set "isWeak": true. Their identifying relationship must have "isIdentifying": true.
6.  **Attributes on Relationships:** If a relationship has its own attributes (like a "grade" on an "enrolls" relationship), add them to the "attributes" array for that relationship.
7.  **Cardinalities:** Use standard notation (1:1, 1:N, M:N) for cardinalities.
8.  **Avoid Duplicates:** Do not include duplicate attributes for the same entity.

Reply ONLY with valid JSON in this exact structure. Do not add comments or markdown.
{
  "entities": [
    {"name": "EntityName", "isWeak": false}
  ],
  "attributes": [
    {"entity": "EntityName", "attribute": "PK_attributeName"},
    {"entity": "EntityName", "attribute": "regularAttribute"},
    {"entity": "EntityName", "attribute": "compositeAttr", "components": ["part1", "part2"]}
  ],
  "relationships": [
    {"from": "Entity1", "to": "Entity2", "label": "relationshipName", "isIdentifying": false, "attributes": ["attributeName"]}
  ],
  "cardinalities": [
    {"from": "Entity1", "to": "Entity2", "type": "1:N"}
  ]
}

Text for extraction:
${userText}
`;
}

app.post("/api/gemini", async (req, res) => {
  const { userText } = req.body;
  if (!userText) {
    return res.status(400).json({ error: "userText is required" });
  }

  const prompt = buildPrompt(userText);

  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not set in environment variables." });
    }

    // Call Gemini 2.5 Flash API
    const result = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 1.0,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 8192
          }
        })
      }
    );

    if (!result.ok) {
      const errorText = await result.text();
      return res.status(result.status).json({
        error: `Failed to communicate with Gemini API: ${result.statusText}`,
        details: errorText
      });
    }

    const data = await result.json();
    let textRaw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Strip Markdown code fences (```json ... ```) if present
    const text = textRaw.replace(/^```json\s*/, "").replace(/```$/, "");

    if (text) {
      try {
        const parsed = JSON.parse(text);

        // Basic validation
        if (!Array.isArray(parsed.entities)) {
          throw new Error("Invalid entities format");
        }
        if (!Array.isArray(parsed.attributes)) {
          throw new Error("Invalid attributes format");
        }

        return res.json(parsed);
      } catch (e) {
        return res.status(400).json({
          error: "Invalid JSON from Gemini",
          raw: textRaw,
          message: e.toString()
        });
      }
    } else {
      return res.status(400).json({ error: "No valid JSON found in Gemini output.", raw: data });
    }
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Gemini proxy server running on http://localhost:${PORT}`);
});
