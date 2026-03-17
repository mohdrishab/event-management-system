
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const generateLeaveReason = async (eventName: string, startDate: string, endDate: string, studentName: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
      Write a professional, concise (2-3 sentences) leave application reason for a university student.
      Student Name: ${studentName}
      Event Name: ${eventName}
      Event Duration: From ${startDate} to ${endDate}
      
      The tone should be academic and polite, requesting approval to attend. Do not include placeholders.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "I would like to request leave to attend this upcoming event.";
  } catch (error) {
    console.error("Gemini generation error:", error);
    return "I request leave to attend this educational event.";
  }
};

export const improveWriting = async (text: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Improve the grammar, flow, and clarity of the following text while keeping the original meaning:\n\n${text}`;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || text;
  } catch (error) {
    console.error("Gemini generation error:", error);
    return text;
  }
};

export const makeProfessional = async (text: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Rewrite the following text to sound highly professional, academic, and polite, suitable for a formal university application:\n\n${text}`;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || text;
  } catch (error) {
    console.error("Gemini generation error:", error);
    return text;
  }
};

export const shortenText = async (text: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Shorten the following text to be concise and to the point, removing unnecessary fluff but keeping the core message:\n\n${text}`;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || text;
  } catch (error) {
    console.error("Gemini generation error:", error);
    return text;
  }
};
