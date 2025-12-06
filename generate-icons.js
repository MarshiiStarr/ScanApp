import fs from 'fs';
import { createCanvas } from 'canvas';

// Helper to make icon
function makeIcon(size, text) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, size, size);

    // Text (Emoji)
    ctx.font = `${size * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2 + (size * 0.05));

    return canvas.toBuffer('image/png');
}

if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

fs.writeFileSync('public/icon-192.png', makeIcon(192, '📸'));
fs.writeFileSync('public/icon-512.png', makeIcon(512, '📸'));
console.log('Icons generated.');
