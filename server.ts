import express from "express";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// Tự động nhận diện khóa bảo mật trên Cloud hoặc Local
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// API Routes - Quét ảnh (OCR)
app.post("/api/ocr", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Không tìm thấy ảnh tải lên" });
    if (!apiKey) return res.status(500).json({ error: "Thiếu API Key trên hệ thống" });

    const mimeType = req.file.mimetype;
    const base64Data = req.file.buffer.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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

    const textOutput = response.text || "";
    const cleanJson = textOutput.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    
    res.json(JSON.parse(cleanJson));
  } catch (error: any) {
    console.error("Vercel OCR Error:", error);
    res.status(500).json({ 
      error: "Failed to process image", 
      details: error.message || "Lỗi không xác định từ Gemini"
    });
  }
});

// API Routes - Chat
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
      model: "gemini-2.0-flash",
      config: {
        systemInstruction: "You are a concise virtual medical assistant helping users manage their medications safely.",
      }
    });

    const response = await chat.sendMessage({ message: prompt });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to generate reply", details: error.message });
  }
});

// Chạy server độc lập hoàn toàn khi ở môi trường Local (Không import Vite vào đây)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Xuất bản cho Vercel Node.js Handler nhận diện
export default app;