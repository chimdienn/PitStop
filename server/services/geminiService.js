/**
 * Gemini AI Service
 * Handles semantic analysis of place reviews for complex queries
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

/**
 * Initialize the Gemini client
 */
function getClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Check if Gemini is configured
 */
export function isConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Analyze reviews to determine if a place matches complex criteria
 * @param {Array} places - Array of place objects with reviews
 * @param {string} criteria - User's search criteria (e.g., "clean toilets", "good coffee")
 * @returns {Array} Places with confidence scores
 */
export async function analyzeReviewsForCriteria(places, criteria) {
  const client = getClient();

  if (!client) {
    console.log("ℹ️  Gemini not configured - skipping AI analysis");
    // Return places with neutral confidence if Gemini isn't available
    return places.map((place) => ({
      ...place,
      aiConfidence: null,
      aiAnalysis: "AI analysis not available",
    }));
  }

  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  const results = await Promise.all(
    places.map(async (place) => {
      try {
        // Extract review texts
        const reviewTexts = (place.reviews || [])
          .slice(0, 5) // Limit to 5 most recent reviews
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

        // Parse JSON response
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
      } catch (error) {
        console.error(
          `AI analysis error for ${place.displayName?.text}:`,
          error.message,
        );
        return {
          ...place,
          aiConfidence: 0.5,
          aiAnalysis: "AI analysis failed",
        };
      }
    }),
  );

  return results;
}

/**
 * Determine if a search query is complex enough to warrant AI analysis
 * @param {string} query - User's search query
 * @returns {boolean} Whether AI analysis should be used
 */
export function isComplexQuery(query) {
  const complexIndicators = [
    "clean",
    "good",
    "best",
    "quality",
    "quiet",
    "fast",
    "friendly",
    "cheap",
    "nice",
    "safe",
    "reliable",
    "fresh",
    "healthy",
    "spacious",
    "parking",
    "wifi",
    "outdoor",
    "seating",
    "drive-thru",
    "drive thru",
    "vegan",
    "vegetarian",
    "organic",
    "local",
    "authentic",
  ];

  const lowerQuery = query.toLowerCase();
  return complexIndicators.some((indicator) => lowerQuery.includes(indicator));
}

export default {
  isConfigured,
  analyzeReviewsForCriteria,
  isComplexQuery,
};
