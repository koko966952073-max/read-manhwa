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
  const [geminiModel, setGeminiModel] = useState("gemini-3.5-flash-lite");

  useEffect(() => {
    setProvider(localStorage.getItem("ai_provider") || "gemini_free");
    setGeminiFreeKey(localStorage.getItem("gemini_free_key") || "");
    setGeminiPaidKey(localStorage.getItem("gemini_paid_key") || "");
    setDeepseekKey(localStorage.getItem("deepseek_api_key") || "");
    setGeminiModel(localStorage.getItem("gemini_model") || "gemini-3.5-flash-lite");
  }, []);

  const handleSave = () => {
    localStorage.setItem("ai_provider", provider);
    localStorage.setItem("gemini_free_key", geminiFreeKey);
    localStorage.setItem("gemini_paid_key", geminiPaidKey);
    localStorage.setItem("deepseek_api_key", deepseekKey);
    localStorage.setItem("gemini_model", geminiModel);
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
            <option value="google_translate">Google Translate (Free + Tesseract OCR)</option>
          </select>
        </div>

        {(provider === "gemini_free" || provider === "gemini_paid") && (
          <div className={styles.formGroup}>
            <label className={styles.label}>Gemini Model</label>
            <select 
              className={styles.select} 
              value={geminiModel} 
              onChange={(e) => setGeminiModel(e.target.value)}
            >
              <option value="Gemini-3.5-flash">Gemini-3.5-flash</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite</option>
              <option value="gemini-3.6-flash">gemini-3.6-flash</option>
              <option value="gemini-3.7-flash">gemini-3.7-flash</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash</option>
            </select>
          </div>
        )}

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
