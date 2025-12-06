import React, { useState, useRef, useEffect } from 'react';
import { CameraView } from './components/CameraView';
import { ScannerOverlay } from './components/ScannerOverlay';
import { ResultsCard } from './components/ResultsCard';
import { SettingsModal } from './components/SettingsModal';
import { analyzeImage } from './services/ai';
import './App.css';

import { HistoryModal } from './components/HistoryModal';

function App() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [frozenFrame, setFrozenFrame] = useState(null);
  const videoRef = useRef(null);

  // Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem('scan_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save History Helper
  const saveToHistory = (newResult) => {
    // Add timestamp if missing
    const item = { ...newResult, timestamp: Date.now() };
    const updated = [item, ...history].slice(0, 50); // Keep last 50
    setHistory(updated);
    localStorage.setItem('scan_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    if (confirm("Clear all history?")) {
      setHistory([]);
      localStorage.removeItem('scan_history');
    }
  };

  // Check for API Key on mount
  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key');
    if (!key) {
      // open settings automatically if no key found (optional, maybe just show a hint)
      // setIsSettingsOpen(true); 
    }
  }, []);

  // Helper to capture frame
  const captureVideoFrame = (video) => {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video frame not ready for capture");
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg");
  };

  const handleScan = async (file = null) => {
    if (scanning) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    setScanning(true);
    setResults(null);
    setFrozenFrame(null); // Reset previous frame

    try {
      let source;

      if (file) {
        // If file upload, create object URL for preview
        source = file;
        const objectUrl = URL.createObjectURL(file);
        setFrozenFrame(objectUrl);
      } else if (videoRef.current) {
        // If camera, capture frame immediately
        const frameData = captureVideoFrame(videoRef.current);
        if (!frameData) {
          throw new Error("Camera not ready. Please try again.");
        }
        setFrozenFrame(frameData);
        source = frameData; // Pass base64 to AI
      } else {
        throw new Error("No image source");
      }

      // Analyze the source (File or Base64 String)
      const data = await analyzeImage(source, apiKey);

      if (data.error) {
        setResults({ ingredients: [{ name: "Error: " + data.error, warning: "Try again" }] });
      } else {
        setResults(data);
        saveToHistory(data); // Save successful scan
      }
    } catch (err) {
      console.error(err);
      setResults({ ingredients: [{ name: "Analysis Failed", warning: err.message }] });
    } finally {
      setScanning(false);
      // We don't clear frozenFrame here so it stays behind results until closed
    }
  };

  const handleCloseResults = () => {
    setResults(null);
    setFrozenFrame(null); // Clear freeze frame when returning to camera
  };

  return (
    <div className="app-container">
      <CameraView onRef={(ref) => (videoRef.current = ref.current)} />

      {/* Freeze Frame Overlay: Displays captured image over camera during scan/results */}
      {frozenFrame && (
        <div
          className="freeze-frame"
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundImage: `url(${frozenFrame})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            zIndex: 5
          }}
        />
      )}

      <ScannerOverlay scanning={scanning} />

      <div className="top-baR">
        <button className="icon-btn history-btn-top" onClick={() => setIsHistoryOpen(true)}>🕒</button>
        <button className="icon-btn settings-btn-top" onClick={() => setIsSettingsOpen(true)}>⚙️</button>
      </div>

      <div className={`controls ${results ? 'hidden' : ''}`}>
        <div className="controls-row">
          <label className="gallery-button">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) handleScan(e.target.files[0]);
              }}
              disabled={scanning}
              style={{ display: 'none' }}
            />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </label>

          <div className="scan-button-wrapper">
            <button
              className={`scan-button ${scanning ? 'active' : ''}`}
              onClick={() => handleScan()}
              disabled={scanning}
            >
              <div className="scan-inner" />
            </button>
          </div>

          <div className="spacer" style={{ width: 50 }}></div>
        </div>
        <div className="controls-text">
          {scanning ? 'Analyzing...' : 'Tap safely to Scan'}
        </div>
      </div>

      <ResultsCard results={results} onClose={handleCloseResults} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={() => console.log("Key Saved")}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectResult={(item) => setResults(item)}
        onClearHistory={clearHistory}
      />
    </div>
  );
}

export default App;
