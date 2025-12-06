import React, { useState, useRef, useEffect } from 'react';
import { CameraView } from './components/CameraView';
import { ScannerOverlay } from './components/ScannerOverlay';
import { ResultsCard } from './components/ResultsCard';
import { SettingsModal } from './components/SettingsModal';
import { analyzeImage } from './services/ai';
import './App.css';

function App() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const videoRef = useRef(null);

  // Check for API Key on mount
  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key');
    if (!key) {
      // open settings automatically if no key found (optional, maybe just show a hint)
      // setIsSettingsOpen(true); 
    }
  }, []);

  const handleScan = async (file = null) => {
    if (scanning) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    setScanning(true);
    setResults(null);

    try {
      const source = file || videoRef.current;
      if (!source) throw new Error("No image source");

      const data = await analyzeImage(source, apiKey);

      if (data.error) {
        // Handle case where AI didn't see food
        setResults({ ingredients: [{ name: "Error: " + data.error, warning: "Try again" }] });
      } else {
        setResults(data);
      }
    } catch (err) {
      console.error(err);
      setResults({ ingredients: [{ name: "Analysis Failed", warning: err.message }] });
    } finally {
      setScanning(false);
    }
  };

  const handleCloseResults = () => {
    setResults(null);
  };

  return (
    <div className="app-container">
      <CameraView onRef={(ref) => (videoRef.current = ref.current)} />

      <ScannerOverlay scanning={scanning} />

      <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}>⚙️</button>

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
            🖼️
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
    </div>
  );
}

export default App;
