import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { text, provider, deepseekKey } = await request.json();

    if (!text || text.trim() === "") {
      return NextResponse.json({
        translations: [{ original_text: "No text found", translated_text: "រកមិនឃើញអក្សរ" }]
      });
    }

    if (provider === "google_translate") {
      // Free Google Translate API
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

      const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: deepseekKey
      });

      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: "You are an expert translator. Clean up any OCR errors, fix typos, ignore garbage characters, and translate the text into natural-sounding Khmer. Return ONLY a JSON array: [{\"original_text\": \"cleaned original text\", \"translated_text\": \"Khmer translation\"}]" },
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

      try {
        const translations = JSON.parse(jsonString);
        return NextResponse.json({ translations });
      } catch (e) {
        // Fallback if DeepSeek doesn't return JSON
        return NextResponse.json({ 
          translations: [{ original_text: text, translated_text: jsonString }] 
        });
      }
    } else {
      return NextResponse.json({ error: "Invalid text translation provider" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Translate text error:", error);
    return NextResponse.json({ error: error.message || "Failed to translate text" }, { status: 500 });
  }
}
