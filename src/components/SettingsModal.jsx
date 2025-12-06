import React, { useState, useEffect } from 'react';
import { testConnection } from '../services/ai';
import './SettingsModal.css';

export function SettingsModal({ isOpen, onClose, onSave }) {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [testStatus, setTestStatus] = useState(null); // null, 'testing', 'success', 'error'
    const [testMessage, setTestMessage] = useState('');

    useEffect(() => {
        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) setApiKey(savedKey);
        setTestStatus(null);
        setTestMessage('');
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('gemini_api_key', apiKey.trim());
        onSave();
        onClose();
    };

    const runTest = async () => {
        setTestStatus('testing');
        setTestMessage('Checking connectivity...');

        const result = await testConnection(apiKey);

        if (result.success) {
            setTestStatus('success');
            setTestMessage(result.message);
        } else {
            setTestStatus('error');
            setTestMessage(result.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="settings-overlay">
            <div className="settings-card">
                <h2>AI Setup (Gemini)</h2>
                <p className="settings-desc">
                    To enable real analysis, please enter your
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"> Google Gemini API Key</a>.
                </p>
                <p className="settings-note">Your key is stored locally on this device.</p>

                <div className="input-wrapper">
                    <input
                        type={showKey ? "text" : "password"}
                        placeholder="Paste API Key here..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="api-input"
                    />
                    <button
                        className="toggle-visibility"
                        onClick={() => setShowKey(!showKey)}
                        title={showKey ? "Hide API Key" : "Show API Key"}
                    >
                        {showKey ? "🙈" : "👁️"}
                    </button>
                </div>

                <div className="test-section">
                    <button
                        onClick={runTest}
                        className="btn-test"
                        disabled={!apiKey || testStatus === 'testing'}
                    >
                        {testStatus === 'testing' ? 'Checking...' : 'Test Connection'}
                    </button>

                    {testMessage && (
                        <div className={`test-result ${testStatus}`}>
                            {testMessage}
                        </div>
                    )}
                </div>

                <div className="settings-actions">
                    <button onClick={onClose} className="btn-cancel">Cancel</button>
                    <button onClick={handleSave} className="btn-save">Save & Enable</button>
                </div>
            </div>
        </div>
    );
}
