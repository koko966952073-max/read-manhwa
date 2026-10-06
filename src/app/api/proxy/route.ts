import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
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
      return new NextResponse(`Error fetching target: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("text/html")) {
      // If it's not HTML, just return it directly (e.g. images, css)
      const body = await response.arrayBuffer();
      const headers = new Headers(response.headers);
      headers.delete("X-Frame-Options");
      headers.delete("Content-Security-Policy");
      return new NextResponse(body, { headers });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Inject base tag to fix relative assets (images, css, js)
    $("head").prepend(`<base href="${new URL(url).origin}" />`);

    // Rewrite all links to route back through our browser proxy
    $("a").each((_, el) => {
      let href = $(el).attr("href");
      if (href) {
        // Resolve absolute URL
        try {
          const absoluteUrl = new URL(href, url).href;
          // Rewrite the link to our proxy viewer
          $(el).attr("href", `/browser?url=${encodeURIComponent(absoluteUrl)}`);
        } catch (e) {
          // Ignore invalid URLs
        }
      }
    });

    // Remove security headers that prevent iframing
    const headers = new Headers(response.headers);
    headers.delete("X-Frame-Options");
    headers.delete("Content-Security-Policy");

    return new NextResponse($.html(), { headers, status: 200 });
  } catch (err: any) {
    return new NextResponse(`Proxy Error: ${err.message}`, { status: 500 });
  }
}
