import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = `
Identify the product in the image.

**GOAL**: Find the **exact ingredient list** for this product.

**CRITICAL STRATEGY**: 
You **MUST** use the Google Search tool.
1. **Identify** the product name and brand.
2. **SEARCH** (Broad + Specific):
   - Query 1: \`"{Product Name}" ingredients New Zealand\`
   - Query 2: \`"{Product Name}" ingredients woolworths paknsave\`
   - Query 3: \`"{Product Name}" ingredients\` (Global fallback)

3. **EXTRACT & PRIORITIZE**:
   - **TIER 1 (Best)**: Official NZ Supermarkets (Woolworths NZ, Pak'nSave, New World).
   - **TIER 2 (Good)**: NZ Pharmacies/Retailers (Chemist Warehouse NZ, The Warehouse, Sephora NZ).
   - **TIER 3 (Fallback)**: Australian Supermarkets (Woolworths AU, Coles) - *Mark as Australian in source name*.
   - **TIER 4 (Last Resort)**: Manufacturer sites or global retailers (Amazon, Tesco).

**OUTPUT SCHEMA (JSON)**:
{
  "productName": "Exact Product Name",
  "category": "Food" or "Cosmetic",
  "sources": [
     {
       "name": "Source Name (e.g. Woolworths NZ)", 
       "url": "URL",
       "ingredients": ["Ingredient 1", "Ingredient 2", "..."]
     }
  ],
  "isVegan": boolean,
  "summary": "Found at [Source]. Ingredients: [Summary]..."
}

**RULES**:
- **NEVER** return an empty list if *any* reliable source is found. ALWAYS fall back to Tier 3/4 if Tier 1/2 fails.
- If using a non-NZ source, mention it in the summary (e.g. "Using Australian data").
- Return **ONLY JSON**.
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

    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        tools: [{
            googleSearchRetrieval: {} // Default settings
        }]
    });

    try {
        console.log("Analyzing with Live Google Search...");
        const result = await model.generateContent([
            PROMPT,
            { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
        ]);

        const responseText = result.response.text();
        console.log("AI Response:", responseText);

        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        let rawData;
        try {
            rawData = JSON.parse(cleanJson);
        } catch (e) {
            console.warn("JSON Parse Failed, attempting fallback", e);
            // Fallback: Try to construct a valid object from the text if possible, or just return an error object
            rawData = {
                productName: "Scan completed (Parse Error)",
                sources: [],
                summary: "We found information but couldn't format it perfectly. Please try scanning again."
            };
        }

        // Sanitize
        if (!Array.isArray(rawData.sources)) rawData.sources = [];
        if (!rawData.ingredients) rawData.ingredients = []; // Backwards compat

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
