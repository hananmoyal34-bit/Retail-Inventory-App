import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
    console.error("API_KEY is not set for Gemini Service.");
}

export const generateProductDescription = async (productName: string): Promise<string> => {
  if (!ai) {
      return "Gemini API not configured. API_KEY is missing.";
  }
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a compelling, short e-commerce product description for: ${productName}. Keep it under 50 words. Focus on key features and benefits for a retail customer.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating product description:", error);
    return "Could not generate description. Please try again.";
  }
};
