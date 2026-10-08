import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Ensure this route can run longer if needed
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { imageUrl, provider, geminiKey } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }
    
    if (!geminiKey) {
      return NextResponse.json({ error: "Gemini API key is required for auto-translate" }, { status: 400 });
    }

    const urlObj = new URL(imageUrl);
    const referer = `${urlObj.protocol}//${urlObj.hostname}/`;

    const imageResp = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": referer,
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!imageResp.ok) {
      throw new Error(`Failed to fetch image: ${imageResp.statusText}`);
    }

    const arrayBuffer = await imageResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    const mimeType = imageResp.headers.get("content-type") || "image/jpeg";

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              box: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.INTEGER },
                description: "[ymin, xmin, ymax, xmax] scaled 0-1000 representing the bounding box of the text"
              },
              original_text: {
                type: SchemaType.STRING,
                description: "The extracted English/Korean text"
              },
              translated_text: {
                type: SchemaType.STRING,
                description: "The Khmer translation"
              }
            },
            required: ["box", "original_text", "translated_text"]
          }
        }
      }
    });

    const prompt = `You are an expert comic/manhwa translator.
Extract all the text/speech bubbles from this comic page.
Translate all the text into natural-sounding Khmer.
For EACH text bubble you find, you MUST provide its bounding box as an array of exactly 4 numbers [ymin, xmin, ymax, xmax] scaled to 0-1000.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType } },
    ]);

    const responseText = result.response.text();
    let jsonString = responseText.trim();
    
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const translations = JSON.parse(jsonString);
    return NextResponse.json({ translations });

  } catch (err: any) {
    console.error("Auto-Translate Error:", err);
    return NextResponse.json({ error: err.message || "Failed to auto-translate image" }, { status: 500 });
  }
}
