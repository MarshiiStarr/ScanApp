import React from 'react';
import './ResultsCard.css';

export function ResultsCard({ results, onClose }) {
    if (!results) return null;

    return (
        <div className="results-card">
            <div className="results-header">
                <div>
                    <h2 style={{ fontSize: '0.9rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px' }}>Detected</h2>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '2px 0 5px 0' }}>{results.productName || "Ingredients Found"}</h1>
                    {results.productName && (
                        <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(results.productName + " ingredients nutrition facts")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: 'var(--primary-accent)',
                                fontSize: '0.9rem',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <span>ℹ️ See Full Details Online</span>
                        </a>
                    )}
                </div>
                <button onClick={onClose} className="close-button">×</button>
            </div>
            <ul className="ingredients-list">
                {results.ingredients && results.ingredients.length > 0 ? (
                    results.ingredients.map((item, index) => (
                        <ExpandableIngredient key={index} item={item} />
                    ))
                ) : (
                    <li className="ingredient-item" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px', opacity: 0.6 }}>
                        <span style={{ fontSize: '2rem', marginBottom: '10px' }}>🕵️‍♀️</span>
                        <span>Ingredients text not found.</span>
                        <span style={{ fontSize: '0.8rem', marginTop: '5px' }}>Check the "Full Details" link above.</span>
                    </li>
                )}
            </ul>
        </div>
    );
}

function ExpandableIngredient({ item }) {
    const [expanded, setExpanded] = React.useState(false);
    const hasDescription = !!item.description;

    return (
        <li className="ingredient-item" onClick={() => hasDescription && setExpanded(!expanded)} style={{ flexDirection: 'column', cursor: hasDescription ? 'pointer' : 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ingredient-name">{item.name}</span>
                    {hasDescription && (
                        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{expanded ? '▲' : '▼'}</span>
                    )}
                </div>
                {item.warning && <span className="ingredient-warning">⚠️ {item.warning}</span>}
            </div>
            {expanded && item.description && (
                <div style={{
                    marginTop: '8px',
                    fontSize: '0.9rem',
                    color: 'rgba(255,255,255,0.7)',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '8px',
                    borderRadius: '8px',
                    width: '100%'
                }}>
                    {item.description}
                </div>
            )}
        </li>
    );
}

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
        </div >
    );
}
