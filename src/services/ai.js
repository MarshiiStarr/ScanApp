import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = `
Analyze this image. If it contains food or a product with ingredients, list the main ingredients.
Format your response as a simple JSON object with a key "ingredients".
Each ingredient should have a "name" and optional "warning" (if it's a common allergen or unhealthy additive).
Example:
{
  "ingredients": [
    { "name": "Water" },
    { "name": "Sugar", "warning": "High Sugar" },
    { "name": "Peanuts", "warning": "Allergen" }
  ]
}
If the image is NOT food or a product, return:
{ "ingredients": [], "error": "No food/product detected" }
Do not surround with markdown backticks. Just return raw JSON.
`;

export async function analyzeImage(videoElement, apiKey) {
    if (!apiKey) {
        throw new Error("API Key missing");
    }

    // 1. Capture image from video
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // 2. Convert to base64 (jpeg)
    const base64Image = canvas.toDataURL("image/jpeg").split(',')[1];

    // 3. Call Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    try {
        const result = await model.generateContent([
            PROMPT,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg",
                },
            },
        ]);

        const responseText = result.response.text();
        console.log("Raw AI Response:", responseText);

        // Clean up markdown if present
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);

    } catch (error) {
        console.error("AI Analysis Failed:", error);
        throw new Error(error.message || "Failed to analyze image");
    }
}
