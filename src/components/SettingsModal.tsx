"use client";

import { useState, useEffect } from "react";
import styles from "./SettingsModal.module.css";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [provider, setProvider] = useState("gemini_free");
  const [geminiFreeKey, setGeminiFreeKey] = useState("");
  const [geminiPaidKey, setGeminiPaidKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");

  useEffect(() => {
    setProvider(localStorage.getItem("ai_provider") || "gemini_free");
    setGeminiFreeKey(localStorage.getItem("gemini_free_key") || "");
    setGeminiPaidKey(localStorage.getItem("gemini_paid_key") || "");
    setDeepseekKey(localStorage.getItem("deepseek_api_key") || "");
  }, []);

  const handleSave = () => {
    localStorage.setItem("ai_provider", provider);
    localStorage.setItem("gemini_free_key", geminiFreeKey);
    localStorage.setItem("gemini_paid_key", geminiPaidKey);
    localStorage.setItem("deepseek_api_key", deepseekKey);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>API Settings</h2>
        
        <div className={styles.formGroup}>
          <label className={styles.label}>AI Provider</label>
          <select 
            className={styles.select} 
            value={provider} 
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="gemini_free">Gemini (Free Key)</option>
            <option value="gemini_paid">Gemini (Paid Key)</option>
            <option value="deepseek">DeepSeek (Tesseract OCR + Translation)</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Gemini Free API Key</label>
          <input 
            type="password" 
            className={styles.input} 
            placeholder="AIzaSy..." 
            value={geminiFreeKey}
            onChange={(e) => setGeminiFreeKey(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Gemini Paid API Key</label>
          <input 
            type="password" 
            className={styles.input} 
            placeholder="AQ..." 
            value={geminiPaidKey}
            onChange={(e) => setGeminiPaidKey(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>DeepSeek API Key</label>
          <input 
            type="password" 
            className={styles.input} 
            placeholder="sk-..." 
            value={deepseekKey}
            onChange={(e) => setDeepseekKey(e.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button className={styles.btnSave} onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
