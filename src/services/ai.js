import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = `
Identify the product in the image.

**GOAL**: Find the **exact ingredient list** for this product sold in **New Zealand**.

**CRITICAL STRATEGY**: 
You **MUST** use the Google Search tool.
1. **Identify** the product name and brand from the image.
2. **SEARCH** for the ingredients using these *specific* queries. Run multiple searches if needed:
   - \`"{Product Name}" ingredients site:woolworths.co.nz\`
   - \`"{Product Name}" ingredients site:paknsave.co.nz\`
   - \`"{Product Name}" ingredients site:newworld.co.nz\`
   - \`"{Product Name}" ingredients site:chemistwarehouse.co.nz\` (if health/beauty)
   - \`"{Product Name}" ingredients New Zealand\`

3. **EXTRACT**: Look for the "Ingredients" section on the pages you find. 
   - IGNORE generic nutritional claims (like "High in protein").
   - EXTRACT the full comma-separated list of ingredients.

**OUTPUT SCHEMA (JSON)**:
{
  "productName": "Exact Product Name",
  "category": "Food" or "Cosmetic",
  "sources": [
     {
       "name": "Woolworths NZ", 
       "url": "https://www.woolworths.co.nz/...",
       "ingredients": ["Ingredient 1", "Ingredient 2", "..."]
     }
  ],
  "isVegan": boolean,
  "summary": "Found at [Store Name]. Ingredients include..." (OR "Could not find this product at NZ supermarkets.")
}

**RULES**:
- If you cannot find the product on an NZ site, try to find the **Australian** version (woolworths.com.au) as they are often identical, but note this in the summary.
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
