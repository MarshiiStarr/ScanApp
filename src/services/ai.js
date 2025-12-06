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
    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting analysis with model: ${ modelName } `);
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
            const cleanJson = responseText.replace(/```json / g, '').replace(/```/g, '').trim();
return JSON.parse(cleanJson);

        } catch (error) {
    console.warn(`Model ${modelName} failed:`, error);
    lastError = error;
    // Continue to next model
}
    }

// If we get here, all models failed
console.error("All AI models failed.");
throw new Error(`AI Analysis Failed. Verify API Key settings. (Error: ${lastError?.message})`);
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
