import { GoogleGenerativeAI } from "@google/generative-ai";

// Models to try in order
const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
];

// Track failed combinations to avoid retrying
const failedCombinations = new Map();
const FAILURE_RESET_TIME = 60 * 60 * 1000; // 1 hour

// Lazy-load API keys (called after dotenv is configured)
function getApiKeys() {
  return [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(
    Boolean,
  );
}

function getClient(apiKey) {
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

export function isConfigured() {
  const keys = getApiKeys();
  console.log(`ℹ️  Gemini API keys configured: ${keys.length}`);
  return keys.length > 0;
}

function isQuotaError(error) {
  const errorMessage = error?.message?.toLowerCase() || "";
  return (
    errorMessage.includes("quota") ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("resource exhausted") ||
    errorMessage.includes("429") ||
    error?.status === 429
  );
}

function getCombinationKey(keyIndex, modelIndex) {
  return `${keyIndex}-${modelIndex}`;
}

function isCombinationAvailable(keyIndex, modelIndex) {
  const key = getCombinationKey(keyIndex, modelIndex);
  const failedAt = failedCombinations.get(key);
  if (!failedAt) return true;

  if (Date.now() - failedAt > FAILURE_RESET_TIME) {
    failedCombinations.delete(key);
    return true;
  }
  return false;
}

function markCombinationFailed(keyIndex, modelIndex) {
  const key = getCombinationKey(keyIndex, modelIndex);
  failedCombinations.set(key, Date.now());
}

// Build a single batched prompt for all places
function buildBatchedPrompt(places, criteria) {
  const placesData = places.map((place, index) => {
    const reviewTexts = (place.reviews || [])
      .slice(0, 3) // Limit reviews per place to keep prompt size manageable
      .map((r) => r.text?.text || r.text || "")
      .filter((text) => text.length > 0);

    return {
      index,
      name: place.displayName?.text || place.displayName || "Unknown",
      rating: place.rating || "N/A",
      reviewCount: place.userRatingCount || 0,
      reviews: reviewTexts.length > 0 ? reviewTexts : ["No reviews available"],
    };
  });

  const prompt = `You are analyzing multiple places to determine how well each matches specific criteria.

CRITERIA TO EVALUATE: "${criteria}"

PLACES TO ANALYZE:
${placesData
  .map(
    (p) => `
[Place ${p.index}] ${p.name}
Rating: ${p.rating} (${p.reviewCount} reviews)
Reviews:
${p.reviews.map((r, i) => `  ${i + 1}. "${r.substring(0, 200)}${r.length > 200 ? "..." : ""}"`).join("\n")}
`,
  )
  .join("\n---\n")}

For EACH place, provide:
1. A confidence score from 0.0 to 1.0 indicating how well it matches the criteria
2. A brief one-sentence explanation (max 15 words)

IMPORTANT: Respond ONLY with a valid JSON array in this exact format, with one object per place in the same order:
[
  {"index": 0, "confidence": 0.X, "explanation": "Brief explanation"},
  {"index": 1, "confidence": 0.X, "explanation": "Brief explanation"},
  ...
]

Do not include any text before or after the JSON array.`;

  return prompt;
}

// Parse the batched response
function parseBatchedResponse(responseText, placesCount) {
  try {
    // Try to extract JSON array from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Could not find JSON array in response");
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      console.error("Parsed response is not an array");
      return null;
    }

    // Create a map for quick lookup
    const resultsMap = new Map();
    parsed.forEach((item) => {
      if (
        typeof item.index === "number" &&
        typeof item.confidence === "number"
      ) {
        resultsMap.set(item.index, {
          confidence: Math.max(0, Math.min(1, item.confidence)),
          explanation: item.explanation || "No explanation provided",
        });
      }
    });

    return resultsMap;
  } catch (error) {
    console.error("Failed to parse batched response:", error.message);
    return null;
  }
}

async function tryAnalyzeWithModelBatched(client, modelName, places, criteria) {
  const model = client.getGenerativeModel({ model: modelName });

  // Build single batched prompt
  const prompt = buildBatchedPrompt(places, criteria);

  console.log(`   Sending batched request for ${places.length} places...`);

  // Single API call for all places
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Parse the batched response
  const resultsMap = parseBatchedResponse(responseText, places.length);

  if (!resultsMap) {
    throw new Error("Failed to parse AI response");
  }

  // Map results back to places
  const results = places.map((place, index) => {
    const aiResult = resultsMap.get(index);

    if (aiResult) {
      return {
        ...place,
        aiConfidence: aiResult.confidence,
        aiAnalysis: aiResult.explanation,
      };
    }

    // Fallback if this place wasn't in the response
    return {
      ...place,
      aiConfidence: 0.5,
      aiAnalysis: "Analysis not available for this place",
    };
  });

  return results;
}

export async function analyzeReviewsForCriteria(places, criteria) {
  const API_KEYS = getApiKeys();

  if (API_KEYS.length === 0) {
    console.log("ℹ️  Gemini not configured - skipping AI analysis");
    return places.map((place) => ({
      ...place,
      aiConfidence: null,
      aiAnalysis: "AI analysis not available",
    }));
  }

  // Try each API key and model combination
  for (let keyIndex = 0; keyIndex < API_KEYS.length; keyIndex++) {
    const apiKey = API_KEYS[keyIndex];
    const client = getClient(apiKey);

    if (!client) continue;

    for (let modelIndex = 0; modelIndex < MODELS.length; modelIndex++) {
      const modelName = MODELS[modelIndex];

      // Skip if this combination recently failed
      if (!isCombinationAvailable(keyIndex, modelIndex)) {
        console.log(
          `⏭️  Skipping ${modelName} with key ${keyIndex + 1} (recently failed)`,
        );
        continue;
      }

      try {
        console.log(`🤖 Trying ${modelName} with API key ${keyIndex + 1}...`);
        const results = await tryAnalyzeWithModelBatched(
          client,
          modelName,
          places,
          criteria,
        );
        console.log(
          `✅ Success with ${modelName} (1 request for ${places.length} places)`,
        );
        return results;
      } catch (error) {
        console.error(
          `❌ Error with ${modelName} (key ${keyIndex + 1}):`,
          error.message,
        );

        if (isQuotaError(error)) {
          console.log(
            `⚠️  Quota reached for ${modelName} with key ${keyIndex + 1}, trying next...`,
          );
          markCombinationFailed(keyIndex, modelIndex);
          continue;
        }

        // For non-quota errors, still try next combination
        continue;
      }
    }
  }

  // All combinations exhausted
  console.log("⚠️  All Gemini API keys and models exhausted");
  return places.map((place) => ({
    ...place,
    aiConfidence: null,
    aiAnalysis: "AI quota temporarily exhausted, try again later",
  }));
}

export default {
  isConfigured,
  analyzeReviewsForCriteria,
};
