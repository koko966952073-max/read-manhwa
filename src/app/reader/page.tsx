"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./page.module.css";
import SettingsModal from "../../components/SettingsModal";
import { createWorker } from "tesseract.js";

interface Translation {
  original_text: string;
  translated_text: string;
  box?: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  box_2d?: [number, number, number, number];
  ymin?: number;
  xmin?: number;
  ymax?: number;
  xmax?: number;
}

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SocialPopup = ({ onClose }: { onClose: () => void }) => {
  const handleSubscribe = () => {
    localStorage.setItem("hasSubscribed", "true");
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose} style={{ zIndex: 100 }}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title} style={{textAlign: 'center'}}>Support the Creator! 💖</h2>
        <p style={{textAlign: 'center', marginBottom: '20px', color: 'var(--text-secondary)'}}>Please follow our pages to get the latest updates!</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{margin: '0 0 10px 0'}}>📘 Facebook</h3>
            <div style={{display: 'flex', gap: '10px'}}>
              <a href="fb://profile/61570744166491" onClick={handleSubscribe} className="btn-primary" style={{flex: 1, textAlign: 'center', textDecoration: 'none'}}>Open in App</a>
              <a href="https://www.facebook.com/profile.php?id=61570744166491" onClick={handleSubscribe} target="_blank" className="btn-secondary" style={{flex: 1, textAlign: 'center', textDecoration: 'none'}}>Open in Browser</a>
            </div>
          </div>
          
          <div>
            <h3 style={{margin: '0 0 10px 0'}}>▶️ YouTube</h3>
            <div style={{display: 'flex', gap: '10px'}}>
              <a href="vnd.youtube://www.youtube.com/@BongHout99" onClick={handleSubscribe} className="btn-primary" style={{flex: 1, textAlign: 'center', background: '#ef4444', textDecoration: 'none'}}>Open in App</a>
              <a href="https://www.youtube.com/@BongHout99" onClick={handleSubscribe} target="_blank" className="btn-secondary" style={{flex: 1, textAlign: 'center', textDecoration: 'none'}}>Open in Browser</a>
            </div>
          </div>
        </div>

        <button className={styles.btnCancel} style={{width: '100%', marginTop: '20px'}} onClick={onClose}>Close (Maybe Later)</button>
      </div>
    </div>
  );
};

function ReaderContent() {
  const searchParams = useSearchParams();
  const currentUrl = searchParams.get("url");
  const router = useRouter();

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [error, setError] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [interactionMode, setInteractionMode] = useState<"scroll" | "draw">("scroll");

  const [processingImageIndex, setProcessingImageIndex] = useState<number | null>(null);
  const [translations, setTranslations] = useState<{ [key: number]: Translation[] }>({});

  // Crop State
  const [drawingIndex, setDrawingIndex] = useState<number | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [renderedBoxes, setRenderedBoxes] = useState<{ [key: number]: {x: number, y: number, width: number, height: number} }>({});
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    if (!currentUrl) {
      setError("No URL provided");
      setLoading(false);
      return;
    }

    const fetchImages = async () => {
      try {
        setLoading(true);
        setError("");
        setImages([]);
        setTranslations({});
        const response = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: currentUrl }),
        });
        const data = await response.json();
        if (response.ok) {
          if (data.images && data.images.length > 0) {
            setImages(data.images);
          } else {
            setError("No images found on the provided URL.");
          }
        } else {
          setError(data.error || "Failed to fetch images");
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [currentUrl]);

  const navigateChapter = (direction: 'next' | 'prev') => {
    if (!currentUrl) return;
    const regex = /(\d+)(?!.*\d)/;
    const match = currentUrl.match(regex);
    if (match) {
      const currentNum = parseInt(match[0], 10);
      const nextNum = direction === 'next' ? currentNum + 1 : Math.max(1, currentNum - 1);
      // Replace the last number block with the new number
      const lastIndex = currentUrl.lastIndexOf(match[0]);
      const newUrl = currentUrl.substring(0, lastIndex) + nextNum.toString() + currentUrl.substring(lastIndex + match[0].length);
      localStorage.setItem("lastReadUrl", newUrl);
      
      const savedHistory = localStorage.getItem("readingHistory");
      let historyArr = savedHistory ? JSON.parse(savedHistory) : [];
      historyArr = [newUrl, ...historyArr.filter((u: string) => u !== newUrl)].slice(0, 10);
      localStorage.setItem("readingHistory", JSON.stringify(historyArr));
      
      router.push(`/reader?url=${encodeURIComponent(newUrl)}`);
    } else {
      alert("Could not detect chapter number in URL.");
    }
  };

  useEffect(() => {
    const hasSubscribed = localStorage.getItem("hasSubscribed");
    if (!hasSubscribed) {
      const timer = setTimeout(() => {
        setShowSocial(true);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, index: number) => {
    if (processingImageIndex !== null) return;
    if (interactionMode === 'scroll') return;
    
    // Clear previous translations for this index to allow drawing a new box
    if (translations[index]) {
      const newTranslations = { ...translations };
      delete newTranslations[index];
      setTranslations(newTranslations);
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawingIndex(index);
    setStartPos({ x, y });
    setCurrentPos({ x, y });
    setIsDrawing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setCurrentPos({ x, y });
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>, index: number, src: string) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    const imgEl = imageRefs.current[index];
    if (!imgEl) return;

    // Calculate selection relative to the rendered div
    const x1 = Math.min(startPos.x, currentPos.x);
    const y1 = Math.min(startPos.y, currentPos.y);
    const x2 = Math.max(startPos.x, currentPos.x);
    const y2 = Math.max(startPos.y, currentPos.y);
    const boxW = x2 - x1;
    const boxH = y2 - y1;

    // Minimum drag distance to trigger translation (e.g., 20px)
    if (boxW < 20 || boxH < 20) {
      setDrawingIndex(null);
      return;
    }

    // Save the rendered box to position the UI later
    setRenderedBoxes(prev => ({
      ...prev,
      [index]: { x: x1, y: y1, width: boxW, height: boxH }
    }));

    // Convert rendered coordinates to original image coordinates
    const scaleX = imgEl.naturalWidth / rect.width;
    const scaleY = imgEl.naturalHeight / rect.height;

    const cropBox: CropBox = {
      x: Math.round(x1 * scaleX),
      y: Math.round(y1 * scaleY),
      width: Math.round(boxW * scaleX),
      height: Math.round(boxH * scaleY),
    };

    setDrawingIndex(null);
    await processImageCrop(index, src, cropBox);
  };

  const processFullImage = async (index: number, src: string) => {
    const provider = localStorage.getItem("ai_provider") || "gemini_free";
    const geminiFreeKey = localStorage.getItem("gemini_free_key") || "";
    const geminiPaidKey = localStorage.getItem("gemini_paid_key") || "";
    const deepseekKey = localStorage.getItem("deepseek_api_key") || "";
    
    let geminiKey = provider === "gemini_paid" ? geminiPaidKey : geminiFreeKey;

    setProcessingImageIndex(index);
    // Clear any previous boxes
    setRenderedBoxes((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

    try {
      if (provider === "google_translate" || provider === "deepseek") {
        // Tesseract full page
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(src)}`;
        const imgBlob = await fetch(proxyUrl).then(r => r.blob());
        const imgBitmap = await createImageBitmap(imgBlob);

        const canvas = document.createElement("canvas");
        canvas.width = imgBitmap.width;
        canvas.height = imgBitmap.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create canvas context");

        ctx.drawImage(imgBitmap, 0, 0);
        const base64Crop = canvas.toDataURL("image/jpeg");

        const worker = await createWorker("eng+kor");
        const { data: { text } } = await worker.recognize(base64Crop);
        await worker.terminate();

        if (!text || text.trim() === "") {
           setTranslations((prev) => ({ 
             ...prev, 
             [index]: [{ original_text: "No text found", translated_text: "រកមិនឃើញអក្សរ" }] 
           }));
           return;
        }

        if (provider === "google_translate") {
          const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=km&dt=t&q=${encodeURIComponent(text)}`;
          const translateResp = await fetch(translateUrl);
          if (!translateResp.ok) throw new Error("Google Translate API blocked this IP. Try DeepSeek or Gemini.");
          const translateData = await translateResp.json();
          let translatedText = "";
          if (translateData && translateData[0]) {
            translateData[0].forEach((t: any) => {
              if (t[0]) translatedText += t[0];
            });
          }
          setTranslations((prev) => ({ 
            ...prev, 
            [index]: [{ original_text: text, translated_text: translatedText }] 
          }));
        } else {
          const response = await fetch("/api/translate-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, provider, deepseekKey }),
          });

          const data = await response.json();
          if (response.ok && data.translations) {
            setTranslations((prev) => ({ ...prev, [index]: data.translations }));
          } else {
            alert(data.error || "Failed to translate text");
          }
        }
      } else {
        // Gemini Full Page Auto Translate
        const response = await fetch("/api/auto-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: src, provider: provider, geminiKey }),
        });

        const data = await response.json();
        if (response.ok && data.translations) {
          setTranslations((prev) => ({ ...prev, [index]: data.translations }));
        } else {
          alert(data.error || "Failed to process image");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to AI service.");
    } finally {
      setProcessingImageIndex(null);
    }
  };

  const processImageCrop = async (index: number, src: string, crop: CropBox) => {
    const provider = localStorage.getItem("ai_provider") || "gemini_free";
    const geminiFreeKey = localStorage.getItem("gemini_free_key") || "";
    const geminiPaidKey = localStorage.getItem("gemini_paid_key") || "";
    const deepseekKey = localStorage.getItem("deepseek_api_key") || "";
    
    let geminiKey = provider === "gemini_paid" ? geminiPaidKey : geminiFreeKey;

    setProcessingImageIndex(index);
    try {
      if (provider === "google_translate" || provider === "deepseek") {
        // --- Client-Side OCR Path ---
        // Fetch image via proxy to avoid CORS issues when drawing to canvas
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(src)}`;
        const imgBlob = await fetch(proxyUrl).then(r => r.blob());
        const imgBitmap = await createImageBitmap(imgBlob);

        // Draw cropped portion to offscreen canvas
        const canvas = document.createElement("canvas");
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not create canvas context");

        ctx.drawImage(
          imgBitmap,
          crop.x, crop.y, crop.width, crop.height, // source
          0, 0, crop.width, crop.height // destination
        );

        // Extract base64
        const base64Crop = canvas.toDataURL("image/jpeg");

        // Run client-side OCR
        const worker = await createWorker("eng+kor");
        const { data: { text } } = await worker.recognize(base64Crop);
        await worker.terminate();

        if (!text || text.trim() === "") {
           setTranslations((prev) => ({ 
             ...prev, 
             [index]: [{ original_text: "No text found", translated_text: "រកមិនឃើញអក្សរ" }] 
           }));
           return;
        }

        if (provider === "google_translate") {
          // Client-side Google Translate fetch to bypass Vercel IP blocks
          const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=km&dt=t&q=${encodeURIComponent(text)}`;
          const translateResp = await fetch(translateUrl);
          if (!translateResp.ok) throw new Error("Google Translate API blocked this IP. Try DeepSeek or Gemini.");
          const translateData = await translateResp.json();
          let translatedText = "";
          if (translateData && translateData[0]) {
            translateData[0].forEach((t: any) => {
              if (t[0]) translatedText += t[0];
            });
          }
          setTranslations((prev) => ({ 
            ...prev, 
            [index]: [{ original_text: text, translated_text: translatedText }] 
          }));
        } else {
          // Send raw text to the lightweight translation endpoint for DeepSeek
          const response = await fetch("/api/translate-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, provider, deepseekKey }),
          });

          const data = await response.json();
          if (response.ok && data.translations) {
            setTranslations((prev) => ({ ...prev, [index]: data.translations }));
          } else {
            alert(data.error || "Failed to translate text");
          }
        }

      } else {
        // --- Server-Side Native Vision Path (Gemini) ---
        const response = await fetch("/api/process-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: src, provider: provider, geminiKey, deepseekKey, crop }),
        });

        const data = await response.json();
        if (response.ok && data.translations) {
          setTranslations((prev) => ({ ...prev, [index]: data.translations }));
        } else {
          alert(data.error || "Failed to process image");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to AI service.");
    } finally {
      setProcessingImageIndex(null);
    }
  };

  const handleReadAloud = (e: React.MouseEvent, text: string, lang: 'en' | 'km' = 'km') => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Some browsers need time to load voices, so we get them dynamically
      const voices = window.speechSynthesis.getVoices();
      
      if (lang === 'km') {
        // Try to find Piseth voice (e.g. Edge's km-KH-PisethNeural), or any Khmer voice
        const pisethVoice = voices.find(v => v.name.toLowerCase().includes('piseth'));
        const khmerVoice = voices.find(v => v.lang.includes('km') || v.name.toLowerCase().includes('khmer'));
        
        if (pisethVoice) {
          utterance.voice = pisethVoice;
        } else if (khmerVoice) {
          utterance.voice = khmerVoice;
        } else {
          utterance.lang = 'km-KH';
          // If voices are loaded but no Khmer voice is found
          if (voices.length > 0 && !text.match(/^[a-zA-Z0-9\s.,?!]+$/)) {
            alert("កម្មវិធី (Browser) នេះមិនមានប្រព័ន្ធសំឡេងខ្មែរទេ។ សូម Copy លីងនេះទៅបើកក្នុងកម្មវិធី Microsoft Edge ដើម្បីអាចស្ដាប់សំឡេងខ្មែរបាន!");
            return;
          }
        }
        // Slightly reduce speed for better Khmer pronunciation if needed
        utterance.rate = 0.8;
      } else {
        // English Male voice
        const englishMaleVoices = voices.filter(v => 
          v.lang.startsWith('en') && 
          (v.name.toLowerCase().includes('male') || 
           v.name.toLowerCase().includes('guy') || 
           v.name.toLowerCase().includes('christopher') || 
           v.name.toLowerCase().includes('ryan') || 
           v.name.toLowerCase().includes('david') ||
           v.name.toLowerCase().includes('daniel') ||
           v.name.toLowerCase().includes('arthur') ||
           v.name.toLowerCase().includes('aaron') ||
           v.name.toLowerCase().includes('gordon'))
        );
        
        if (englishMaleVoices.length > 0) {
          // Prefer Neural voices if available (Edge)
          const neuralVoice = englishMaleVoices.find(v => v.name.includes('Neural'));
          utterance.voice = neuralVoice || englishMaleVoices[0];
        } else {
          // Fallback to any english voice
          const anyEnglish = voices.find(v => v.lang.startsWith('en'));
          if (anyEnglish) utterance.voice = anyEnglish;
          utterance.lang = 'en-US';
        }
        utterance.rate = 0.8;
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-Speech is not supported in this browser.");
    }
  };

  const formatOriginalText = (text: string) => {
    if (!text) return text;
    // Check if text is mostly uppercase
    const upperCount = (text.match(/[A-Z]/g) || []).length;
    const lowerCount = (text.match(/[a-z]/g) || []).length;
    if (upperCount > lowerCount) {
      // Convert to lowercase, then capitalize the first letter of each sentence
      return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
    }
    return text;
  };

  const handleCloseTranslation = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const newTranslations = { ...translations };
    delete newTranslations[index];
    setTranslations(newTranslations);
  };

  const handleTranslateAll = async () => {
    if (!window.confirm("This will translate the entire chapter. It might take a minute. Continue?")) return;
    setIsTranslatingAll(true);
    for (let i = 0; i < images.length; i++) {
      if (!translations[i]) {
        await processFullImage(i, images[i]);
      }
    }
    setIsTranslatingAll(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push("/")}>
          ← Back
        </button>
        <div className={styles.title}>Reader</div>
        <button className={styles.backBtn} onClick={() => setIsSettingsOpen(true)}>
          ⚙️ Settings
        </button>
      </header>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}

      {loading && <div className={styles.loading}>Loading Chapter...</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!loading && !error && images.length > 0 && (
        <div className={styles.readerArea}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', background: 'rgba(0,0,0,0.5)', marginBottom: '10px', borderRadius: '12px' }}>
            <button onClick={() => navigateChapter('prev')} className="btn-secondary" style={{ padding: '8px 15px' }}>
              ⬅️ Prev
            </button>
            <button 
              onClick={handleTranslateAll} 
              className="btn-primary" 
              style={{ background: isTranslatingAll ? '#6b7280' : 'var(--accent-color)', padding: '8px 20px', fontWeight: 'bold' }}
              disabled={isTranslatingAll}
            >
              {isTranslatingAll ? "⏳ Translating..." : "✨ Translate All"}
            </button>
            <button onClick={() => navigateChapter('next')} className="btn-secondary" style={{ padding: '8px 15px' }}>
              Next ➡️
            </button>
          </div>
          <p style={{textAlign: "center", color: "var(--text-secondary)", marginBottom: "1rem"}}>
            ✨ Tip: You can also tap "Translate All" or use Draw Mode to select text manually!
          </p>
          {images.map((src, index) => {
            const isCurrentlyDrawing = isDrawing && drawingIndex === index;
            const drawX = Math.min(startPos.x, currentPos.x);
            const drawY = Math.min(startPos.y, currentPos.y);
            const drawW = Math.abs(currentPos.x - startPos.x);
            const drawH = Math.abs(currentPos.y - startPos.y);

            return (
              <div key={index} className={styles.imageContainer}>
                <div 
                  className={styles.imageWrapper}
                  onPointerDown={(e) => handlePointerDown(e, index)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={(e) => handlePointerUp(e, index, src)}
                  style={{ 
                    touchAction: interactionMode === 'draw' ? 'none' : 'auto',
                    WebkitTouchCallout: interactionMode === 'draw' ? 'none' : 'default',
                    WebkitUserSelect: interactionMode === 'draw' ? 'none' : 'auto',
                    userSelect: interactionMode === 'draw' ? 'none' : 'auto'
                  }} 
                >
                  <img
                    ref={(el) => { imageRefs.current[index] = el; }}
                    src={src}
                    alt={`Page ${index + 1}`}
                    className={styles.comicImage}
                    loading={index < 3 ? "eager" : "lazy"}
                    draggable={false}
                    style={{ pointerEvents: 'none' }}
                  />

                  {/* Draw Selection Box */}
                  {isCurrentlyDrawing && (
                    <div 
                      style={{
                        position: 'absolute',
                        border: '2px solid var(--accent-color)',
                        background: 'rgba(99, 102, 241, 0.2)',
                        left: drawX,
                        top: drawY,
                        width: drawW,
                        height: drawH,
                        pointerEvents: 'none',
                        zIndex: 20
                      }}
                    />
                  )}

                  {processingImageIndex === index && (
                    <div className={styles.overlay}>
                      <div className={styles.loading} style={{ marginTop: 0 }}>
                        AI Processing...
                      </div>
                    </div>
                  )}

                  {/* Render overlays for texts with bounding boxes */}
                  {translations[index] && !renderedBoxes[index] && translations[index].some(t => t.ymin !== undefined || t.box_2d || t.box) && (
                    translations[index].map((t, i) => {
                      let ymin, xmin, ymax, xmax;
                      if (t.ymin !== undefined && t.xmin !== undefined && t.ymax !== undefined && t.xmax !== undefined) {
                        ymin = t.ymin; xmin = t.xmin; ymax = t.ymax; xmax = t.xmax;
                      } else if (t.box_2d || t.box) {
                        const box = t.box_2d || t.box;
                        if (!box) return null;
                        [ymin, xmin, ymax, xmax] = box;
                      } else {
                        return null;
                      }
                      
                      const top = (ymin / 1000) * 100;
                      const left = (xmin / 1000) * 100;
                      const width = ((xmax - xmin) / 1000) * 100;
                      const height = ((ymax - ymin) / 1000) * 100;
                      
                      return (
                        <div 
                          key={i}
                          className={styles.translationCard}
                          style={{
                            position: 'absolute',
                            top: `${top}%`, // Position exactly on top of the original text
                            left: `${Math.max(0, left - 5)}%`, // Center it slightly
                            width: `${Math.min(100, width + 10)}%`, // Match width roughly
                            maxWidth: '300px',
                            padding: '12px 15px',
                            zIndex: 10,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                          }}
                        >
                          <div className={styles.translationItem} style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
                            <div className={styles.khmerText} style={{ fontSize: '1.1rem' }}>{t.translated_text}</div>
                            <div className={styles.originalText} style={{ fontSize: '0.85rem', marginBottom: '10px' }}>{formatOriginalText(t.original_text)}</div>
                            <div className={styles.actionRow}>
                              <button 
                                className={styles.iconBtn}
                                onClick={(e) => handleReadAloud(e, formatOriginalText(t.original_text), 'en')}
                                title="Read Original"
                              >
                                🔊
                              </button>
                              <button 
                                className={styles.iconBtn}
                                onClick={(e) => handleReadAloud(e, t.translated_text, 'km')}
                                title="Read Translation"
                              >
                                🇰🇭🔊
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>



                {translations[index] && !renderedBoxes[index] && !translations[index].some(t => t.ymin !== undefined || t.box_2d || t.box) && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', margin: '0 10px 20px 10px' }}>
                      <h3 style={{ color: 'var(--accent-color)', marginBottom: '15px', fontSize: '1rem' }}>Translated Text</h3>
                      {translations[index].map((t, i) => (
                        <div key={i} className={styles.translationItem} style={{ marginBottom: '15px' }}>
                          <div className={styles.khmerText} style={{ fontSize: '1.1rem' }}>{t.translated_text}</div>
                          <div className={styles.originalText} style={{ fontSize: '0.9rem' }}>{formatOriginalText(t.original_text)}</div>
                        </div>
                      ))}
                    </div>
                    <button 
                      className={`btn-primary ${styles.closeBtn}`}
                      onClick={() => handleCloseTranslation({ stopPropagation: () => {} } as any, index)}
                      style={{ width: 'calc(100% - 20px)', margin: '10px 10px 20px 10px' }}
                    >
                      Close Translation
                    </button>
                  </div>
                )}

                {translations[index] && renderedBoxes[index] && (
                    <div 
                      className={styles.overlay} 
                      onClick={(e) => handleCloseTranslation(e, index)} 
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerMove={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                      style={{ display: 'block' }}
                    >
                      <div 
                        className={styles.translationCard} 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left: renderedBoxes[index] 
                            ? Math.min(renderedBoxes[index].x, (imageRefs.current[index]?.clientWidth || 500) - 250) 
                            : '50%',
                          top: renderedBoxes[index] 
                            ? renderedBoxes[index].y + renderedBoxes[index].height + 10 
                            : '50%',
                          transform: renderedBoxes[index] ? 'none' : 'translate(-50%, -50%)',
                          maxWidth: '280px',
                          zIndex: 30
                        }}
                      >
                        {translations[index].map((t, i) => (
                          <div key={i} className={styles.translationItem}>
                            <div className={styles.khmerText}>{t.translated_text}</div>
                            <div className={styles.originalText}>{formatOriginalText(t.original_text)}</div>
                            <div className={styles.actionRow}>
                              <button 
                                className={styles.iconBtn}
                                onClick={(e) => handleReadAloud(e, formatOriginalText(t.original_text), 'en')}
                                title="Read Original"
                              >
                                🔊
                              </button>
                              <button 
                                className={styles.iconBtn}
                                onClick={(e) => handleReadAloud(e, t.translated_text, 'km')}
                                title="Read Translation"
                              >
                                🇰🇭🔊
                              </button>
                            </div>
                          </div>
                        ))}
                        <button 
                          className={`btn-primary ${styles.closeBtn}`}
                          onClick={(e) => handleCloseTranslation(e, index)}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Navigation Buttons */}
      {images.length > 0 && (
        <div style={{ textAlign: 'center', margin: '40px 0', display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button className="btn-primary" onClick={() => navigateChapter('prev')} style={{ padding: '12px 24px', fontSize: '1.1rem' }}>
            ⬅️ Prev Chapter
          </button>
          <button className="btn-primary" onClick={() => navigateChapter('next')} style={{ padding: '12px 24px', fontSize: '1.1rem', background: 'var(--accent-color)' }}>
            Next Chapter ➡️
          </button>
        </div>
      )}

      <button 
        onClick={() => setInteractionMode(prev => prev === 'scroll' ? 'draw' : 'scroll')}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '10px 20px',
          borderRadius: '25px',
          background: interactionMode === 'scroll' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(139, 92, 246, 0.9)',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          zIndex: 50,
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {interactionMode === 'scroll' ? '🖐 Scroll Mode' : '✏️ Draw Mode'}
      </button>

      {showSocial && <SocialPopup onClose={() => setShowSocial(false)} />}
    </div>
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.loading}>Loading...</div></div>}>
      <ReaderContent />
    </Suspense>
  );
}
