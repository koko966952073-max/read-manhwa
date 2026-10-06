import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Attempt to fetch the URL
    // We add common user-agent to avoid simple bot protections
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const images: string[] = [];

    // Most manhwa sites wrap chapter images in an element with an id like 'readerarea' or similar classes
    // We'll target 'img' inside common reader containers, or just all images if we can't find a container.
    // Asurascans uses #readerarea
    const readerArea = $("#readerarea");
    
    if (readerArea.length > 0) {
      readerArea.find("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
        if (src && !src.includes("discord") && !src.includes("logo")) {
          images.push(src.trim());
        }
      });
    } else {
      // Fallback: get all large images or images in main content
      $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
        // Filtering out common UI icons
        if (
          src &&
          !src.includes("icon") &&
          !src.includes("logo") &&
          !src.includes("avatar")
        ) {
          images.push(src.trim());
        }
      });
    }

    return NextResponse.json({ images });
  } catch (error: any) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      { error: "Internal server error during scraping" },
      { status: 500 }
    );
  }
}
