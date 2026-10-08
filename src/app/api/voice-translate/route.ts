import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { audioBase64, mimeType, geminiKey } = await request.json();

    if (!audioBase64) {
      return NextResponse.json({ error: "No audio data provided" }, { status: 400 });
    }
    
    if (!geminiKey) {
      return NextResponse.json({ error: "Gemini API key is required" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash"
    });

    const prompt = `You are an expert translator. Listen to the provided audio.
1. Transcribe the spoken text accurately.
2. Translate the transcribed text into natural-sounding Khmer.
Return ONLY a valid JSON object with 'transcript' and 'translation' keys. Do NOT include any markdown formatting.`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: mimeType || 'audio/webm'
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const responseText = result.response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // Fallback if the model returns markdown despite instructions
      const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      data = JSON.parse(cleaned);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Voice Translate Error:", error);
    return NextResponse.json(
      { error: "Failed to process audio: " + error.message },
      { status: 500 }
    );
  }
}
