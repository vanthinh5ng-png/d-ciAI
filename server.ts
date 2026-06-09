import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/ocr", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const mimeType = req.file.mimetype;
      const base64Data = req.file.buffer.toString("base64");

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { inlineData: { mimeType, data: base64Data } },
          { text: `Analyze this prescription image and return JSON. 
Extract the following fields and format as a JSON array of objects, with each object containing:
- name (string): Name of the medicine
- dosage (string): Dosage amount (e.g., "1 viên", "10ml")
- times (array of strings): Times to take it, e.g., ["Sáng"], ["Trưa", "Tối"]
- instructions (string): Any remarks, like "Sau ăn", "Trước ăn"

Do not wrap in markdown tags, return raw JSON array.` }
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const textOutput = response.text.trim();
      res.json(JSON.parse(textOutput));
    } catch (error) {
      console.error("OCR Error:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      
      const prompt = `
You are a helpful virtual medical assistant. 
Here is the current medications context for the user:
${JSON.stringify(context, null, 2)}

User asks: ${message}

Provide a direct, helpful, and concise answer. Include this disclaimer at the bottom:
"AI chỉ mang tính chất hỗ trợ thông tin, vui lòng tuân thủ tuyệt đối chỉ định của bác sĩ."
      `;

      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: "You are a concise virtual medical assistant helping users manage their medications safely without giving strict medical diagnoses.",
        }
      });

      const response = await chat.sendMessage({ message: prompt });
      res.json({ text: response.text });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to generate reply" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
