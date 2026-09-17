import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName = import.meta.env.VITE_GEMINI_MODEL || "gemini-1.5-flash";


const genAI = new GoogleGenerativeAI(apiKey);

/**
 * history: [{ role: "user"|"assistant", content: string }, ...]
 * message: string
 */
export async function sendToGemini(message, history = []) {
  const model = genAI.getGenerativeModel({ model: modelName });

  // Convert your UI history into Gemini's "contents" format
  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Add the current message as the latest user turn
  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  const result = await model.generateContent({ contents });
  const response = result.response;
  return response.text();
}