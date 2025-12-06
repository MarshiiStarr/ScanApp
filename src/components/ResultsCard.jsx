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
        </div>
    );
}
