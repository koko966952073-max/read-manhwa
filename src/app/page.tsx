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
      // Redirect to the reader page with the URL as a query parameter
      router.push(`/reader?url=${encodeURIComponent(url)}`);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Read Manhwa</h1>
        <p className={styles.subtitle}>
          Read your favorite comics with AI-powered Khmer translation and Voice Text-to-Speech integration.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`glass-panel animate-fade-in ${styles.formContainer}`}>
        <div className={styles.inputGroup}>
          <label htmlFor="comic-url" className={styles.label}>
            Comic Chapter URL
          </label>
          <input
            id="comic-url"
            type="url"
            placeholder="e.g. https://asurascans.com/comics/.../chapter/107"
            className={styles.input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>
        <button type="submit" className={`btn-primary ${styles.submitBtn}`}>
          Start Reading
        </button>
      </form>
    </main>
  );
}
