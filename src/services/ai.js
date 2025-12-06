import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = `
Identify the product in the image.

**GOAL**: Find the **exact ingredients** for this product sold in **New Zealand**.

**SEARCH INSTRUCTIONS**:
1. Search for the product name + "ingredients" + "New Zealand".
2. You **MUST** find the information on one of these specific websites:
   - **woolworths.co.nz** (Countdown)
   - **paknsave.co.nz**
   - **newworld.co.nz**
   - **sephora.nz** (if cosmetic)

3. **VERIFY**: Read the website content. The ingredients MUST match the NZ version (look for "Sugar" first in M&Ms, not Corn Syrup).
4. **OUTPUT**: Return the data in this JSON format. If you cannot find it on an NZ site, return empty sources.

**Output JSON**:
{
  "productName": "Name",
  "category": "Food" or "Cosmetic",
  "analysisMethod": "LiveSearch",
  "sources": [
     {
       "name": "Domain Found On",
       "url": "Specific Page URL",
       "ingredients": ["List"]
     }
  ],
  "isVegan": boolean
}
Return raw JSON.
`;

export async function analyzeImage(imageSource, apiKey) {
    if (!apiKey) throw new Error("API Key missing");

    let base64Image = "";
    if (imageSource.tagName === 'VIDEO') {
        const canvas = document.createElement("canvas");
        canvas.width = imageSource.videoWidth;
        canvas.height = imageSource.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
        base64Image = canvas.toDataURL("image/jpeg").split(',')[1];
    } else if (imageSource instanceof File) {
        base64Image = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(imageSource);
        });
    } else if (typeof imageSource === 'string') {
        base64Image = imageSource.includes(',') ? imageSource.split(',')[1] : imageSource;
    } else {
        throw new Error("Invalid image source");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // UPGRADE: Use Gemini 1.5 Pro for better reasoning and search usage
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        tools: [{
            googleSearchRetrieval: {
                dynamicRetrievalConfig: {
                    mode: "MODE_DYNAMIC",
                    dynamicThreshold: 0.7,
                },
            },
        }]
    });

    try {
        console.log("Analyzing with Live Google Search (Gemini 1.5 Pro)...");
        const result = await model.generateContent([
            PROMPT,
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
        ]);

        const responseText = result.response.text();
        console.log("AI Response:", responseText);

        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const rawData = JSON.parse(cleanJson);

        // Sanitize
        if (!Array.isArray(rawData.sources)) rawData.sources = [];
        if (!rawData.ingredients) rawData.ingredients = [];

        return rawData;

    } catch (error) {
        console.error("AI Search Failed:", error);
        throw new Error(`Analysis Failed: ${error.message}`);
    }
}

// Diagnostic Tool
export async function testConnection(apiKey) {
    if (!apiKey) return { success: false, message: "No API Key provided" };

    try {
        // Try REST API directly to list models (avoids SDK weirdness)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            const err = await response.json();
            return {
                success: false,
                message: `Google API Error (${response.status}): ${err.error?.message || response.statusText}`
            };
        }

        const data = await response.json();
        if (data && data.models) {
            // Filter for generateContent supported models
            const available = data.models
                .filter(m => m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''))
                .join(', ');

            return { success: true, message: `Success! Available models: ${available}` };
        }

        return { success: false, message: "Key valid, but NO models returned from ListModels." };

    } catch (error) {
        return { success: false, message: `Network Error: ${error.message}` };
    }
}
