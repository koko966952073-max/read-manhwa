"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function BrowserPage() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";
  const router = useRouter();

  const [urlInput, setUrlInput] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(true);

  // Sync URL bar when navigating inside iframe (via proxy rewriting)
  useEffect(() => {
    setUrlInput(initialUrl);
    setCurrentUrl(initialUrl);
  }, [initialUrl]);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = urlInput.trim();
    if (target && !target.startsWith("http://") && !target.startsWith("https://")) {
      target = "https://" + target;
    }
    router.push(`/browser?url=${encodeURIComponent(target)}`);
  };

  const handleReadChapter = () => {
    // Navigates to the reader page with the current URL
    router.push(`/reader?url=${encodeURIComponent(currentUrl)}`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.iconBtn} onClick={() => router.push("/")} title="Home">
            🏠
          </button>
          
          <form className={styles.urlBarForm} onSubmit={handleNavigate}>
            <input 
              type="text" 
              className={styles.urlInput}
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="Enter Website URL..."
            />
            <button type="submit" className={styles.goBtn}>Go</button>
          </form>

          <button 
            className={styles.readBtn} 
            onClick={handleReadChapter}
            title="Translate & Read Chapter"
          >
            🇰🇭 Read Chapter
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Loading Website...</p>
          </div>
        )}
        
        {currentUrl ? (
          <iframe 
            src={`/api/proxy?url=${encodeURIComponent(currentUrl)}`}
            className={styles.iframe}
            onLoad={() => setLoading(false)}
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        ) : (
          <div className={styles.emptyState}>
            <h2>Welcome to Manhwa Browser</h2>
            <p>Enter a website URL above to start browsing.</p>
          </div>
        )}
      </main>
    </div>
  );
}
