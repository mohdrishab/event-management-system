import { GoogleGenAI } from "@google/genai";

export const generateLeaveReason = async (eventName: string, startDate: string, endDate: string, studentName: string): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("API Key not found");
    return "I would like to attend this event to enhance my skills.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Write a professional, concise (2-3 sentences) leave application reason for a university student.
      Student Name: ${studentName}
      Event Name: ${eventName}
      Event Duration: From ${startDate} to ${endDate}
      
      The tone should be academic and polite, requesting approval to attend. Do not include placeholders.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "I would like to request leave to attend this upcoming event.";
  } catch (error) {
    console.error("Gemini generation error:", error);
    return "I request leave to attend this educational event.";
  }
};