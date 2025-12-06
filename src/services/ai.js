import { GoogleGenerativeAI } from "@google/generative-ai";

const PROMPT = `
Analyze this image. If it contains **Food** OR **Cosmetics/Makeup** products, list the main ingredients.
Format your response as a simple JSON object with keys "productName", "category", "ingredients", "isVegan", "analysisMethod", and "knowledgeSources".
- "productName": A short name of the product.
- "category": String. Must be either "Food" or "Cosmetic".
- "analysisMethod": String. Either "OCR" (if you read the ingredients directly from the image text) OR "KnowledgeBase" (if you recognized the product and inferred ingredients from your training data).
- "knowledgeSources": Array of strings. IF analysisMethod is "KnowledgeBase", list sources ONLY if you are certain.
  - **CRITICAL**: Do NOT invent sources. If a specific product variant (e.g. "Cheirosa 48") is likely not in public databases, state "General Brand Formulation" or "Similar Products".
  - DO NOT list "INCIDecoder" or "Sephora" unless you are sure the product is listed there.
- "isVegan": Boolean (true/false). True ONLY if the product appears free of all animal-derived ingredients (meat, dairy, eggs, honey, beeswax, lanolin, carmine, etc).
- "ingredients": Array of objects with "name", optional "warning", and optional "description".
- IMPORTANT: Check for these allergens in ALL products (Food & Cosmetics):
  1. DAIRY (Milk, Casein, Whey, Lactose, Cream, Butter, Cheese, Lactoferrin, etc.)
  2. EGG (Egg, Albumin, Globulin, Ovum, Lysozyme, Ovalbumin, etc.)
  3. CINNAMON & CINNAMATES (Cinnamal, Cinnamyl Alcohol, Benzyl Cinnamate, Octinoxate, Octocrylene, Cinoxate, Octyl Methoxycinnamate).
  4. SALICYLATES (Salicylic Acid, Benzyl Salicylate, Homosalate, Octyl Salicylate, Trolamine Salicylate, Phenyl Salicylate, Amyl Salicylate).
- **SOURCE PRIORITY**: For skin allergens (Salicylates/Cinnamates), apply guidelines from **DermNetNZ.org** and **PubChem**.
- **ACCURACY RULE**: In "KnowledgeBase" mode, do NOT list specific chemical allergens (like Benzyl Salicylate) unless you are certain they are in this specific variant.
- **Connection**: If you flag a specific allergen (like Benzyl Salicylate) that is often hidden inside "Fragrance", explicitly say so in the warning (e.g. "Warning: Likely present inside Fragrance/Parfum").
- **DEEP DIVE**: If an ingredient is vague (e.g. "Fragrance", "Parfum", "Flavor", "Spices"), add a "description" field explaining what it likely hides.
  - Example: { "name": "Fragrance", "warning": "Potential Risk", "description": "Fragrance mixes often contain hidden allergens like Cinnamal or Limonene." }
- Do NOT flag anything else (like Sugar/Peanuts/Parabens).
- FALLBACK: If the ingredient text is unreadable or hidden, but you recognize the product (e.g. "Head & Shoulders"), list the **standard known ingredients** for that product from your knowledge base.
- Example: { "name": "Amyl Cinnamal", "warning": "Cinnamon Derivative" }, { "name": "Water" }
If the image is NOT food or a product, return:
{ "productName": "Unknown", "ingredients": [], "error": "No food/product detected" }
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
            return JSON.parse(cleanJson);

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
