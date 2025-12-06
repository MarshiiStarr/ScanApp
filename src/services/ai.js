import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = `
Analyze the image to identify the product.

**STRICT SOURCING PROTOCOL**:

**CATEGORY 1: BEAUTY / COSMETICS / FRAGRANCE / SKINCARE**
- **MANDATORY SOURCE**: You must search **EXCLUSIVELY on Sephora (sephora.com, sephora.nz)**.
- **FORBIDDEN SOURCES**: **DO NOT** check EWG, Amazon, Ulta, Paula's Choice, or any other site. **EWG IS STRICTLY BANNED**.
- **ACTION**: Simulate reading the "Ingredients" tab for this specific product on Sephora.
- **IF NOT FOUND**: If the product is not currently sold on Sephora, return "sources": [].

**CATEGORY 2: FOOD / BEVERAGE**
- **MANDATORY SOURCE**: You must search **EXCLUSIVELY on New Zealand Supermarket websites** (e.g., `countdown.co.nz`, `newworld.co.nz`, `paknsave.co.nz`).
- **FORBIDDEN SOURCES**: **DO NOT** use data from Walmart, Tesco, Amazon Fresh, or general "US/UK" versions of the product.
- **GEOLOCATION LOCK**: If the product is sold globally (e.g. "Coke"), you must find the **NZ-specific formulation** listed on a NZ retailer site. If you cannot confirm the NZ version, return EMPTY.

**DATA EXTRACTION (ZERO TOLERANCE)**
- **OCULAR VERIFICATION**: Only list ingredients you can "see" on the simulated page of the specific allowed domain.
- **NO HALLUCINATIONS**: If the list is missing, hidden, or the product is out of stock on the NZ site, return EMPTY. Do not guess based on the US label.

**Output Format (JSON):**
{
  "productName": "Exact Name",
  "category": "Food" or "Cosmetic",
  "analysisMethod": "MultiSource",
  "sources": [
     {
       "name": "Sephora" (or NZ Store Name),
       "url": "Likely URL",
       "location": "Ingredients Tab",
       "ingredients": ["List", "of", "exact", "ingredients"]
     }
  ],
  "isVegan": boolean
}

Do not surround with markdown backticks. Just return raw JSON.
`;

export async function analyzeImage(imageSource, apiKey) {
    if (!apiKey) {
        throw new Error("API Key missing");
    }

    let base64Image = "";

    // Handle Video Element
    if (imageSource.tagName === 'VIDEO') {
        const canvas = document.createElement("canvas");
        canvas.width = imageSource.videoWidth;
        canvas.height = imageSource.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);
        base64Image = canvas.toDataURL("image/jpeg").split(',')[1];
    }
    // Handle File Object (Upload)
    else if (imageSource instanceof File) {
        base64Image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(imageSource);
        });
    }
    // Handle Base64 String (Direct)
    else if (typeof imageSource === 'string') {
        // Allow passing raw base64 or data uri
        base64Image = imageSource.includes(',') ? imageSource.split(',')[1] : imageSource;
    }
    else {
        throw new Error("Invalid image source");
    }

    // 3. Define models to try (Fallback strategy)
    const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro"
    ];
    const genAI = new GoogleGenerativeAI(apiKey);

    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting analysis with model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

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
            const rawData = JSON.parse(cleanJson);

            // SANITIZE DATA (Prevent App Crashes)
            // Ensure knowledgeSources is an array
            if (rawData.knowledgeSources && !Array.isArray(rawData.knowledgeSources)) {
                // If it's a string, wrap it. If it's something else, empty array.
                rawData.knowledgeSources = typeof rawData.knowledgeSources === 'string'
                    ? [rawData.knowledgeSources]
                    : [];
            }
            // Ensure ingredients is an array
            if (!Array.isArray(rawData.ingredients)) {
                rawData.ingredients = [];
            }

            return rawData;

        } catch (error) {
            console.warn(`Model ${modelName} failed:`, error);
            lastError = error;
            // Continue to next model
        }
    }

    // If we get here, all models failed
    console.error("All AI models failed.");
    throw new Error(`AI Analysis Failed. Verified API Key? (Error: ${lastError?.message})`);
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
