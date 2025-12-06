import React from 'react';
import './ResultsCard.css';

export function ResultsCard({ results, onClose }) {
    if (!results) return null;

    return (
        <div className="results-card">
            <div className="results-header">
                <div>
                    <h2 style={{ fontSize: '0.9rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Detected</h2>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '2px 0 0 0' }}>{results.productName || "Ingredients Found"}</h1>
                </div>
                <button onClick={onClose} className="close-button">×</button>
            </div>
            <ul className="ingredients-list">
                {results.ingredients.map((item, index) => (
                    <li key={index} className="ingredient-item">
                        <span className="ingredient-name">{item.name}</span>
                        {item.warning && <span className="ingredient-warning">⚠️ {item.warning}</span>}
                    </li>
                ))}
            </ul>

            <button
                onClick={onClose}
                className="scan-again-btn"
                style={{
                    marginTop: '20px',
                    padding: '16px',
                    background: 'var(--text-primary)',
                    color: 'black',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
            >
                Scan New Item
            </button>
        </div>
    );
}
