import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { createWorker } from "tesseract.js";
import sharp from "sharp";

export async function POST(request: Request) {
  try {
    const { imageUrl, provider, geminiKey, deepseekKey, geminiModel, crop } = await request.json();
    console.log("=== Incoming Request ===");
    console.log("Provider:", provider);
    console.log("Crop:", crop);

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
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
    let buffer = Buffer.from(arrayBuffer);
    
    // Apply Crop if coordinates are provided
    if (crop && crop.width > 0 && crop.height > 0) {
      buffer = await sharp(buffer)
        .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
        .toBuffer();
    }

    const base64Image = buffer.toString("base64");
    const mimeType = imageResp.headers.get("content-type") || "image/jpeg";

    if (provider === "google_translate") {
      // Run Tesseract OCR on the cropped buffer
      const worker = await createWorker('eng+kor');
      const { data: { text } } = await worker.recognize(buffer);
      await worker.terminate();

      if (!text || text.trim() === "") {
         return NextResponse.json({ translations: [{ original_text: "No text found", translated_text: "រកមិនឃើញអក្សរ" }] });
      }

      // Call Free Google Translate API
      // translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=km&dt=t&q=...
      const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=km&dt=t&q=${encodeURIComponent(text)}`;
      const translateResp = await fetch(translateUrl);
      const translateData = await translateResp.json();
      
      let translatedText = "";
      if (translateData && translateData[0]) {
        translateData[0].forEach((t: any) => {
          if (t[0]) translatedText += t[0];
        });
      }

      return NextResponse.json({ 
        translations: [{ original_text: text, translated_text: translatedText }] 
      });

    } else if (provider === "deepseek") {
      if (!deepseekKey) {
        return NextResponse.json({ error: "DeepSeek API Key is missing in settings" }, { status: 400 });
      }

      // Run Tesseract OCR on the cropped buffer
      const worker = await createWorker('eng+kor');
      const { data: { text } } = await worker.recognize(buffer);
      await worker.terminate();

      if (!text || text.trim() === "") {
         return NextResponse.json({ translations: [{ original_text: "No text found", translated_text: "រកមិនឃើញអក្សរ" }] });
      }

      // Send to DeepSeek
      const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: deepseekKey
      });

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: "You are an expert translator. The user provides text extracted from a comic via OCR. Follow these rules:\n1. Fix OCR typos and ignore garbage characters (like random slashes, numbers, or symbols e.g. `/ 50` or `\\`).\n2. If the text is just noise or not a real word, ignore it entirely and do not include it in the output.\n3. Translate the cleaned text into natural-sounding Khmer.\nReturn ONLY a JSON array: [{\"original_text\": \"cleaned original text\", \"translated_text\": \"Khmer translation\"}]" },
          { role: "user", content: text }
        ],
        model: "deepseek-chat",
      });

      const responseText = completion.choices[0].message.content || "[]";
      
      let jsonString = responseText.trim();
      if (jsonString.startsWith("```json")) {
        jsonString = jsonString.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```/, "").replace(/```$/, "").trim();
      }

      let translations = [];
      try {
         translations = JSON.parse(jsonString);
      } catch (e) {
         translations = [{ original_text: text.substring(0, 50), translated_text: jsonString }];
      }

      return NextResponse.json({ translations });
    } else {
      // Default to Gemini
      const apiKey = geminiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "Gemini API Key is missing in settings" }, { status: 400 });
      }
      
      // If the user is using an OpenAI compatible proxy for Gemini, we should use OpenAI SDK.
      // But standard Gemini uses GoogleGenerativeAI. We'll stick to GoogleGenerativeAI as planned.
      // And we use gemini-1.5-flash-latest to avoid the 404 error if they have standard key.
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: geminiModel || "gemini-3.5-flash-lite" });

      const prompt = `
        You are an expert translator. Read all the text in this image crop.
        Follow these rules:
        1. Fix any OCR typos or misread characters.
        2. Ignore garbage characters, random numbers, or noise (like slashes, stray letters) that are not part of the actual dialogue.
        3. If the text is just noise, return an empty array [].
        4. Translate the cleaned text into natural-sounding Khmer (Cambodian language).
        Return ONLY a JSON array of objects.
        Do not include markdown blocks like \`\`\`json.
        Format:
        [
          {
            "original_text": "the cleaned original text in English or Korean",
            "translated_text": "the Khmer translation"
          }
        ]
      `;

      const imageParts = [{ inlineData: { data: base64Image, mimeType } }];
      const result = await model.generateContent([prompt, ...imageParts]);
      const responseText = result.response.text();

      let jsonString = responseText.trim();
      if (jsonString.startsWith("```json")) {
        jsonString = jsonString.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```/, "").replace(/```$/, "").trim();
      }

      let translations = [];
      try {
         translations = JSON.parse(jsonString);
      } catch (e) {
         translations = [{ original_text: "Format Error", translated_text: jsonString }];
      }
      
      return NextResponse.json({ translations });
    }
  } catch (error: any) {
    console.error("Process image error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process image" },
      { status: 500 }
    );
  }
}
