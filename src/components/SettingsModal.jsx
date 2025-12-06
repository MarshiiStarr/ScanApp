import React, { useState, useEffect } from 'react';
import './SettingsModal.css';

export function SettingsModal({ isOpen, onClose, onSave }) {
    const [apiKey, setApiKey] = useState('');

    useEffect(() => {
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) setApiKey(savedKey);
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('gemini_api_key', apiKey.trim());
        onSave();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="settings-overlay">
            <div className="settings-card">
                <h2>AI Setup</h2>
                <p className="settings-desc">
                    To enable real analysis, please enter your
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"> Google Gemini API Key</a>.
                </p>
                <p className="settings-note">Your key is stored locally on this device.</p>

                <input
                    type="password"
                    placeholder="Paste API Key here..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="api-input"
                />

                <div className="settings-actions">
                    <button onClick={onClose} className="btn-cancel">Cancel</button>
                    <button onClick={handleSave} className="btn-save">Save & Enable</button>
                </div>
            </div>
        </div>
    );
}
