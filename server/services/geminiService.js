import { GoogleGenerativeAI } from "@google/generative-ai";

// Models to try in order
const MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
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

async function tryAnalyzeWithModel(client, modelName, places, criteria) {
  const model = client.getGenerativeModel({ model: modelName });

  const results = await Promise.all(
    places.map(async (place) => {
      const reviewTexts = (place.reviews || [])
        .slice(0, 5)
        .map((r) => r.text?.text || r.text || "")
        .filter((text) => text.length > 0);

      if (reviewTexts.length === 0) {
        return {
          ...place,
          aiConfidence: 0.5,
          aiAnalysis: "No reviews available for analysis",
        };
      }

      const prompt = `You are analyzing customer reviews for a place to determine if it matches specific criteria.

Criteria to evaluate: "${criteria}"

Place: ${place.displayName?.text || place.displayName}
Rating: ${place.rating || "N/A"} (${place.userRatingCount || 0} reviews)

Recent reviews:
${reviewTexts.map((text, i) => `${i + 1}. "${text}"`).join("\n")}

Based on these reviews, provide:
1. A confidence score from 0.0 to 1.0 indicating how well this place matches the criteria
2. A brief one-sentence explanation

Respond ONLY in this exact JSON format:
{"confidence": 0.X, "explanation": "Brief explanation"}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...place,
          aiConfidence: Math.max(0, Math.min(1, parsed.confidence)),
          aiAnalysis: parsed.explanation,
        };
      }

      return {
        ...place,
        aiConfidence: 0.5,
        aiAnalysis: "Unable to parse AI response",
      };
    }),
  );

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
        const results = await tryAnalyzeWithModel(
          client,
          modelName,
          places,
          criteria,
        );
        console.log(`✅ Success with ${modelName}`);
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
