import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = `
Analyze this image. If it contains **Food** OR **Cosmetics/Makeup** products, list the main ingredients.

**MODE: CONSENSUS SEARCH**
1. Identify the product name and variant.
2. Simulate a search for this products ingredient list across the **Top 15 Popular Retail & Informational Websites** (e.g. Amazon, Sephora, UIta, Target, Walmart, Boots, Walgreens, EWG, INCIDecoder, Paulas Choice, official brand site, etc.).
3. **Compare** the lists found on these different sites.
4. **Sort** the ingredients by "Consensus":
   - **High Consensus**: Ingredients appearing on almost ALL checked sites.
   - **Medium Consensus**: Ingredients appearing on MANY sites.
   - **Low Consensus**: Ingredients appearing on only FEW sites.

Format your response as a JSON object:
{
  "productName": "String",
  "category": "Food" or "Cosmetic",
  "analysisMethod": "ConsensusSearch",
  "sourcesChecked": ["List", "of", "sites", "you", "considered"],
  "ingredients": [
    {
       "name": "Ingredient Name",
       "consensus": "High" | "Medium" | "Low",
       "commonality": "Found on ~90% of sites" (Estimations),
       "warning": "Allergen Warning if applicable"
    }
  ],
  "isVegan": Boolean
}

- **Isolate Allergens**: Check for DAIRY, EGG, CINNAMATES, SALICYLATES.
- **Deep Dive**: If "Fragrance" is listed, add a "description" field noting it likely contains hidden allergens if permissible by the consensus data.
- **Strictness**: If the product is NOT found on major sites, return an empty ingredient list and state "Product not widely available for consensus" in an error field.

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
