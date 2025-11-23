import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CapturedFrame, HandoutData } from "../types";

const processBase64Image = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};

const HANDOUT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A catchy, instructional title for the handout based on the video content.",
    },
    summary: {
      type: Type.STRING,
      description: "A brief 2-3 sentence overview of what is being demonstrated.",
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          title: { type: Type.STRING, description: "Action-oriented title for this step." },
          description: { type: Type.STRING, description: "Detailed instruction explaining the visual." },
          tips: { type: Type.STRING, description: "Optional helpful tip or warning relevant to this step." },
        },
        required: ["stepNumber", "title", "description"],
      },
    },
  },
  required: ["title", "summary", "steps"],
};

const SELECTION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    selectedIndices: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description: "Indices of the selected frames (0-based) that best represent the key steps.",
    }
  },
  required: ["selectedIndices"],
};

export const generateHandoutContent = async (frames: CapturedFrame[]): Promise<HandoutData> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Sort frames by timestamp to ensure chronological order
    const sortedFrames = [...frames].sort((a, b) => a.timestamp - b.timestamp);

    const parts = [];

    // Add images
    for (const frame of sortedFrames) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: processBase64Image(frame.dataUrl),
        },
      });
    }

    // Add text prompt
    parts.push({
      text: `You are an expert technical writer creating an instructional handout. 
      I have provided ${sortedFrames.length} screenshots from a video tutorial in chronological order.
      
      Your task:
      1. Analyze the sequence of images to understand the task being performed.
      2. Generate a structured guide.
      3. For each image, create a corresponding 'Step'.
      4. Ensure the steps match the order of the images provided (Image 1 is Step 1, etc.).
      5. The description should be clear, concise, and helpful for a learner.
      
      Return the result as JSON matching the schema provided.`
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: HANDOUT_SCHEMA,
        systemInstruction: "You are a helpful education assistant specializing in creating clear, step-by-step guides from visual inputs.",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as HandoutData;

  } catch (error) {
    console.error("Error generating handout:", error);
    throw error;
  }
};

export const filterBestFrames = async (frames: CapturedFrame[]): Promise<number[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // We accept the frames as they are (already chronologically scanned usually)
    const parts = [];

    for (const frame of frames) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: processBase64Image(frame.dataUrl),
        },
      });
    }

    parts.push({
      text: `I have extracted ${frames.length} frames from a video tutorial. 
      Identify the best subset of frames (between 4 and 8 frames) that visually explain the key distinct steps of the process.
      Prefer clear images with distinct actions.
      Return the indices of the selected frames (0-based) in the order they appear.`
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: SELECTION_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const result = JSON.parse(text) as { selectedIndices: number[] };
    return result.selectedIndices;

  } catch (error) {
    console.error("Error filtering frames:", error);
    throw error;
  }
};