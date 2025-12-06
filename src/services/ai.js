import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = `
Analyze this image. If it contains **Food** OR **Cosmetics/Makeup** products, identify the product.

**MODE: MULTI-SOURCE VERIFICATION**
1. Identify the product name and variant.
2. Recall the ingredient lists for this product as listed on the **Top Popular Websites** (e.g. Amazon, Sephora, Ulta, Target, EWG, Paulas Choice, Official Brand Site).
3. **Group** the data by Source.

Format your response as a JSON object:
{
  "productName": "String",
  "category": "Food" or "Cosmetic",
  "analysisMethod": "MultiSource",
  "sources": [
  "sources": [
    {
      "name": "Source Name" (e.g. "Sephora", "EWG"),
      "url": "Exact Product Page URL" (or generic search URL if unknown),
      "location": "Context" (e.g. "Ingredients Tab", "Back of Bottle", "Description"),
      "ingredients": ["Water", "Glycerin", "Fragrance"]
    }
  ],
  "isVegan": Boolean
}

- **ZERO TOLERANCE FOR HALLUCINATIONS**:
    - **DO NOT GUESS**. Do NOT list ingredients because they are "usually" in this product.
    - **DO NOT INFER**. Do NOT use your general knowledge of the product formula.
    - **SIMULATED OCR ONLY**: You must act as if you are reading the text on the specific website page.
    - **IF NOT FOUND, RETURN EMPTY**: If you cannot confirm the specific text list for a source, return an empty ingredients array [] for that source. One accurate source is better than 5 guessed ones.
    - **AVAILABILITY CHECK**: Prioritize sources where the product is likely **Currently Sold/Active**. Avoid listing sources if the product is known to be Discontinued or "Out of Stock" on that site.

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
