import React from 'react';
import './ResultsCard.css';

export function ResultsCard({ results, onClose }) {
    // Touch Drag Logic
    const [dragY, setDragY] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const startY = React.useRef(0);
    const currentY = React.useRef(0);
    const cardRef = React.useRef(null);
    const listRef = React.useRef(null);

    if (!results) return null;

    const handleTouchStart = (e) => {
        // Find the scrollable list element
        const listElement = listRef.current;

        // If we have a list and it's scrolled down (scrollTop > 0), DO NOT drag.
        // We only allow dragging if we are at the very top.
        if (listElement && listElement.scrollTop > 0) {
            return;
        }

        startY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const y = e.touches[0].clientY;
        const diff = y - startY.current;

        // Only allow dragging DOWN (positive diff)
        if (diff > 0) {
            // Prevent default scroll if we are acting as a drag
            // Note: This requires passive: false listener often, but simple logic here helps
            currentY.current = diff;
            setDragY(diff);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (currentY.current > 120) {
            // Threshold met - Close
            onClose();
        } else {
            // Reset
            setDragY(0);
            currentY.current = 0;
        }
    };

    return (
        <div
            className="results-card"
            ref={cardRef}
            style={{
                transform: `translateY(${dragY}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className="drag-handle-pill" style={{
                width: '40px',
                height: '4px',
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '4px',
                margin: '8px auto 15px auto'
            }}></div>

            <div className="results-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ fontSize: '0.9rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Detected</h2>
                        {results.isVegan && (
                            <span style={{
                                backgroundColor: '#2ecc71',
                                color: 'black',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                🌱 Vegan
                            </span>
                        )}
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '2px 0 5px 0' }}>{results.productName || "Ingredients Found"}</h1>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.8rem',
                            opacity: 0.8,
                            background: 'rgba(255,255,255,0.1)',
                            padding: '4px 8px',
                            borderRadius: '4px'
                        }}>
                            <span>{results.analysisMethod === 'OCR' ? '📷 Scanned from Label' : '🧠 AI Database (Inferred)'}</span>
                        </div>

                        {results.productName && (
                            <a
                                href={
                                    results.category === 'Cosmetic'
                                        ? `https://www.google.com/search?q=${encodeURIComponent(results.productName + " ingredients (site:ewg.org OR site:paulaschoice.com OR site:incipedia.personalcarecouncil.org OR site:cosmeticsinfo.org OR site:sephora.com OR site:ulta.com OR site:amazon.com OR site:target.com OR site:walmart.com OR site:walgreens.com OR site:boots.com OR site:skicrisma.com OR site:incidecoder.com OR site:skinsafeproducts.com)")}`
                                        : `https://www.google.com/search?q=${encodeURIComponent(results.productName + " ingredients site:openfoodfacts.org OR site:ewg.org OR site:amazon.com OR site:walmart.com")}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: 'var(--primary-accent)',
                                    fontSize: '0.8rem',
                                    textDecoration: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                <span>🔎 Verify Online</span>
                            </a>
                        )}
                    </div>

                    {results.knowledgeSources && results.knowledgeSources.length > 0 && (
                        <div style={{ marginTop: '8px', fontSize: '0.75rem', opacity: 0.6 }}>
                            <span style={{ fontWeight: 'bold' }}>📚 Data attributed to: </span>
                            {results.knowledgeSources.join(', ')}
                        </div>
                    )}



                    {results.analysisMethod === 'MultiSource' && (
                        <div style={{
                            marginTop: '10px',
                            padding: '8px',
                            background: 'rgba(0, 255, 150, 0.1)',
                            border: '1px solid rgba(0, 255, 150, 0.3)',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            color: '#00ff96',
                            textAlign: 'left'
                        }}>
                            <strong>🔍 Multi-Source Verification:</strong> Found data on {results.sources ? results.sources.length : 0} sites.
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="close-button">×</button>
            </div>
            <ul className="ingredients-list" ref={listRef} style={{ padding: '0 10px' }}>
                {results.sources && results.sources.length > 0 ? (
                    results.sources.map((source, index) => (
                        <li key={index} className="source-item" style={{
                            marginBottom: '10px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            overflow: 'hidden'
                        }}>
                            <details style={{ width: '100%' }}>
                                <summary style={{
                                    padding: '12px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    listStyle: 'none'
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        🌐 {source.name}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>▼</span>
                                </summary>
                                <div style={{
                                    padding: '0 12px 12px 12px',
                                    fontSize: '0.9rem',
                                    opacity: 0.9,
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    marginTop: '5px'
                                }}>
                                    <p style={{ margin: '8px 0', fontSize: '0.75rem', opacity: 0.5 }}>Listed Ingredients:</p>
                                    <div style={{ lineHeight: '1.6' }}>
                                        {source.ingredients && source.ingredients.join(', ')}
                                    </div>
                                </div>
                            </details>
                        </li>
                    ))
                ) : (
                    <li className="ingredient-item" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px', opacity: 0.6 }}>
                        <span style={{ fontSize: '2rem', marginBottom: '10px' }}>🕵️‍♀️</span>
                        <span>No sources found.</span>
                    </li>
                )}
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
