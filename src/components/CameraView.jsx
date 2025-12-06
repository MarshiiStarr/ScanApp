import React, { useRef, useEffect, useState } from 'react';
import './CameraView.css';

export function CameraView({ onRef }) {
    const videoRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (onRef) onRef(videoRef);

        let stream = null;

        async function setupCamera() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError("Camera API not available. Ensure you are using HTTPS.");
                return;
            }

            try {
                // Try environment camera first
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
            } catch (err) {
                console.warn("Environment camera failed, trying fallback...", err);
                try {
                    // Fallback to any video source
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: true
                    });
                } catch (fallbackErr) {
                    console.error("All camera attempts failed:", fallbackErr);
                    setError(`Camera Error: ${fallbackErr.message}`);
                    return;
                }
            }

            if (videoRef.current && stream) {
                videoRef.current.srcObject = stream;
                // Explicitly play to avoid mobile auto-play blocks
                try {
                    await videoRef.current.play();
                } catch (playErr) {
                    console.error("Video play failed:", playErr);
                }
            }
            setError(null);
        }

        setupCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [onRef]);

    return (
        <div className="camera-container">
            {error ? (
                <div className="camera-error" style={{ color: 'white', padding: '20px', textAlign: 'center', zIndex: 100 }}>
                    <p>{error}</p>
                    <p style={{ fontSize: '0.8em', marginTop: '10px', opacity: 0.7 }}>Try opening this on localhost or enable Insecure Origins.</p>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    className="camera-video"
                    autoPlay
                    playsInline
                    muted
                />
            )}
        </div>
    );
}
