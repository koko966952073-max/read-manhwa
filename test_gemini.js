const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_KEY");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are an expert comic/manhwa translator.
Extract all the text/speech bubbles from this comic page.
Translate all the text into natural-sounding Khmer.
For EACH text bubble you find, you MUST provide its bounding box as an array of exactly 4 numbers [ymin, xmin, ymax, xmax] scaled to 0-1000.
Return ONLY a valid JSON array of objects, where each object MUST exactly have:
- "box": [ymin, xmin, ymax, xmax]
- "original_text": "The extracted English/Korean text"
- "translated_text": "The Khmer translation"
Do NOT include any markdown formatting like \`\`\`json. Just return the raw JSON array.`;

  // Fetch an image from asurascans to test
  const imageUrl = "https://asurascans.com/wp-content/uploads/2023/10/00-14.jpg"; // just a placeholder, let's use a base64 from a generic image or fetch it
  console.log("Fetching image...");
  const resp = await fetch("https://picsum.photos/400/800"); 
  const arrayBuffer = await resp.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString("base64");
  
  console.log("Calling Gemini...");
  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
    ]);
    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}

test();
