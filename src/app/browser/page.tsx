"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./page.module.css";

function BrowserContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";
  const router = useRouter();

  const [urlInput, setUrlInput] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(true);
  const [loadingTime, setLoadingTime] = useState(0);

  // Sync URL bar when navigating inside iframe (via proxy rewriting)
  useEffect(() => {
    setUrlInput(initialUrl);
    setCurrentUrl(initialUrl);
    setLoading(true);
    setLoadingTime(0);
  }, [initialUrl]);

  // Track loading time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

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
          
          <div className={styles.brandGroup}>
            <img src="/logo.png" alt="Smoray Logo" className={styles.logo} />
            <span className={styles.brandName}>Bong Hout</span>
          </div>

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
          
          <div className={styles.socialGroup}>
            <a href="https://www.facebook.com/profile.php?id=61570744166491" target="_blank" title="Facebook">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" alt="FB" className={styles.socialIcon} />
            </a>
            <a href="https://www.youtube.com/@BongHout99" target="_blank" title="YouTube">
              <img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" alt="YT" className={styles.socialIcon} />
            </a>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Loading Website...</p>
            {loadingTime > 4 && (
              <div style={{ marginTop: '20px', color: '#ff4b4b', textAlign: 'center', maxWidth: '400px' }}>
                <p>⚠️ វិបសាយនេះមានប្រព័ន្ធការពារ (Security Block)!</p>
                <p>ប្រសិនបើលោកអ្នកចង់អានរឿង សូមចុចប៊ូតុង <strong>"🇰🇭 Read Chapter"</strong> នៅខាងលើផ្នែកខាងស្ដាំ ដើម្បីចាប់ផ្ដើមបកប្រែយកតែម្ដង!</p>
              </div>
            )}
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

export default function BrowserPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.loadingOverlay}>Loading...</div></div>}>
      <BrowserContent />
    </Suspense>
  );
}
