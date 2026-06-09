import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
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

    // Đổi sang "gemini-2.5-flash" để sửa triệt để lỗi 404 trên v1beta
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { inlineData: { mimeType, data: base64Data } },
        { text: "Analyze this prescription image and extract the medicine fields accurately according to the requested structure." }
      ],
      config: {
        // Ép định dạng đầu ra là JSON sạch
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the medicine" },
              dosage: { type: Type.STRING, description: "Dosage amount (e.g., '1 viên', '10ml')" },
              times: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: "Times to take it, e.g., ['Sáng'], ['Trưa', 'Tối']" 
              },
              instructions: { type: Type.STRING, description: "Any remarks, like 'Sau ăn', 'Trước ăn'" }
            },
            required: ["name", "dosage", "times", "instructions"]
          }
        }
      }
    });

    const textOutput = response.text || "[]";
    res.json(JSON.parse(textOutput));
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

    // Đồng bộ sang dòng "gemini-2.5-flash" cho đồng nhất
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a concise virtual medical assistant helping users manage their medications safely.",
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to generate reply", details: error.message });
  }
});

// Chạy server độc lập hoàn toàn khi ở môi trường Local
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;