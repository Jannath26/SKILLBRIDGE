import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const generateLearningRoadmap = async (skill: string, currentLevel: string, targetLevel: string) => {
  const prompt = `Create a detailed learning roadmap for someone wanting to learn ${skill}. 
  Current Level: ${currentLevel}. 
  Target Level: ${targetLevel}.
  Provide a structured plan with stages. For each stage, provide a "searchQuery" that can be used to find the best tutorials on YouTube or documentation.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                searchQuery: { type: Type.STRING },
                milestones: { type: Type.ARRAY, items: { type: Type.STRING } },
                estimatedWeeks: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const chatWithAssistant = async (history: any[], message: string) => {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are SkillBridge AI, a helpful learning assistant. Help users with their roadmaps, explain concepts, and suggest mentors."
    }
  });

  // Rebuild history if needed, but for simplicity:
  const result = await chat.sendMessage({ message });
  return result.text;
};
