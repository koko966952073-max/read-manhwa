"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./page.module.css";
import SettingsModal from "../../components/SettingsModal";

interface Translation {
  original_text: string;
  translated_text: string;
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
  const url = searchParams.get("url");
  const router = useRouter();

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
    if (!url) {
      setError("No URL provided");
      setLoading(false);
      return;
    }

    const fetchImages = async () => {
      try {
        const response = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
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
  }, [url]);

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

  const processImageCrop = async (index: number, src: string, crop: CropBox) => {
    const provider = localStorage.getItem("ai_provider") || "gemini_free";
    const geminiFreeKey = localStorage.getItem("gemini_free_key") || "";
    const geminiPaidKey = localStorage.getItem("gemini_paid_key") || "";
    const deepseekKey = localStorage.getItem("deepseek_api_key") || "";
    
    let geminiKey = provider === "gemini_paid" ? geminiPaidKey : geminiFreeKey;

    setProcessingImageIndex(index);
    try {
      const response = await fetch("/api/process-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl: src, provider: provider, geminiKey, deepseekKey, crop }),
      });

      const data = await response.json();
      if (response.ok && data.translations) {
        setTranslations((prev) => ({ ...prev, [index]: data.translations }));
      } else {
        alert(data.error || "Failed to process image");
      }
    } catch (err) {
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
          <p style={{textAlign: "center", color: "var(--text-secondary)", marginBottom: "1rem"}}>
            ✨ Tip: Switch to ✏️ Draw Mode using the bottom right button to select text!
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
                  style={{ touchAction: interactionMode === 'draw' ? 'none' : 'auto' }} // Prevent scrolling only while in draw mode
                >
                  <img
                    ref={(el) => { imageRefs.current[index] = el; }}
                    src={src}
                    alt={`Page ${index + 1}`}
                    className={styles.comicImage}
                    loading={index < 3 ? "eager" : "lazy"}
                    draggable={false}
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

                  {translations[index] && (
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
              </div>
            );
          })}
        </div>
      )}

      <button 
        onClick={() => setInteractionMode(prev => prev === 'scroll' ? 'draw' : 'scroll')}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          background: interactionMode === 'scroll' ? '#3b82f6' : '#8b5cf6',
          color: 'white',
          fontSize: '28px',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}
        title={interactionMode === 'scroll' ? "Switch to Draw Mode" : "Switch to Scroll Mode"}
      >
        {interactionMode === 'scroll' ? '🖐' : '✏️'}
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
