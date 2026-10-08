"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function Home() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      // Redirect to the browser page with the URL as a query parameter
      router.push(`/browser?url=${encodeURIComponent(url)}`);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.topBrand}>
        <img src="/logo.png" alt="Smoray Logo" className={styles.logo} />
        <span className={styles.brandName}>Bong Hout</span>
      </div>

      <div className={styles.hero}>
        <h1 className={styles.title}>Read Manhwa Browser</h1>
        <p className={styles.subtitle}>
          Browse your favorite comics with AI-powered Khmer translation and Voice Text-to-Speech integration.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`glass-panel animate-fade-in ${styles.formContainer}`}>
        <div className={styles.inputGroup}>
          <label htmlFor="comic-url" className={styles.label}>
            Website or Chapter URL
          </label>
          <input
            id="comic-url"
            type="text"
            placeholder="e.g. asuracomic.net"
            className={styles.input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={`btn-primary ${styles.submitBtn}`}>
          Start Browsing
        </button>
      </form>

      <div className={styles.qrSection}>
        <p>Scan to Support Creator</p>
        <img src="/qrcode.jpg" alt="Support QR Code" className={styles.qrCode} />
        <div className={styles.homeSocialGroup}>
          <a href="https://www.facebook.com/profile.php?id=61570744166491" target="_blank" className={`btn-primary ${styles.socialBtn}`}>
            📘 Facebook
          </a>
          <a href="https://www.youtube.com/@BongHout99" target="_blank" className={`btn-primary ${styles.socialBtn}`} style={{background: '#ef4444'}}>
            ▶️ YouTube
          </a>
        </div>
      </div>
    </main>
  );
}
