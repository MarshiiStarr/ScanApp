import React from 'react';
import './HistoryModal.css';

export function HistoryModal({ isOpen, onClose, history, onSelectResult, onClearHistory }) {
    if (!isOpen) return null;

    return (
        <div className="history-overlay">
            <div className="history-card">
                <div className="history-header">
                    <h2>Recent Scans</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="history-list">
                    {history.length === 0 ? (
                        <p className="empty-msg">No recent scans found.</p>
                    ) : (
                        history.map((item, index) => (
                            <div
                                key={index}
                                className="history-item"
                                onClick={() => {
                                    onSelectResult(item);
                                    onClose();
                                }}
                            >
                                <div className="item-info">
                                    <span className="item-name">{item.productName || "Unknown Item"}</span>
                                    <span className="item-date">{new Date(item.timestamp).toLocaleDateString()}</span>
                                </div>
                                <span className="item-arrow">›</span>
                            </div>
                        ))
                    )}
                </div>

                {history.length > 0 && (
                    <button className="clear-btn" onClick={onClearHistory}>
                        Clear History
                    </button>
                )}
            </div>
        </div>
    );
}
