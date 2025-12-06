import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = `
Identify the product in the image.

**GOAL**: Find the **exact ingredients** for this product sold in **New Zealand** using Google Search.

**SEARCH STRATEGY**:
1. **QUERY**: Search broadly for: "{Product Name} ingredients New Zealand".
   - *Do NOT limit the search query to specific sites yet. Let Google find the best pages.*
2. **FILTER**: Examine the search results. You are **ONLY ALLOWED** to structure data from these reputable sources:
   - **woolworths.co.nz** (Countdown)
   - **paknsave.co.nz**
   - **newworld.co.nz**
   - **sephora.nz** (for beauty)
   - **chemistwarehouse.co.nz** (accepted backup for beauty/health)

3. **EXTRACT**: If you find a result from one of the allowed domains, read the ingredients **EXACTLY**.
4. **FALLBACK**: If the search results show the product is NOT sold in NZ, or only on US sites (Walmart etc), return "sources": [].

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

    // USE FLASH for Speed + Search
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        tools: [{
            googleSearchRetrieval: {
                dynamicRetrievalConfig: {
                    mode: "MODE_DYNAMIC",
                    dynamicThreshold: 0.6, // Lower threshold to encourage searching
                },
            },
        }]
    });

    try {
        console.log("Analyzing with Live Google Search (Gemini 1.5 Flash)...");
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
