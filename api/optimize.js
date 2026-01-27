import {
  computeRoute,
  computeRouteWithWaypoint,
  searchPlacesAlongRoute,
  getPlaceDetails,
  getPhotoUrl,
} from "./_lib/googleMapsService.js";
import {
  isConfigured,
  analyzeReviewsForCriteria,
} from "./_lib/geminiService.js";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      origin,
      destination,
      query,
      maxResults = 20,
      useAI = false,
    } = req.body;

    if (!origin || !destination || !query) {
      return res.status(400).json({
        error:
          "Missing required fields: origin, destination, and query are required",
      });
    }

    const resultCount = Math.max(1, Math.min(20, maxResults));

    // Step 1: Get primary route
    const primaryRoute = await computeRoute(origin, destination);

    // Step 2: Search for places along route
    const places = await searchPlacesAlongRoute(
      query,
      primaryRoute.encodedPolyline,
      25,
    );

    if (places.length === 0) {
      return res.json({
        success: true,
        primaryRoute: {
          durationSeconds: primaryRoute.durationSeconds,
          distanceMeters: primaryRoute.distanceMeters,
          encodedPolyline: primaryRoute.encodedPolyline,
        },
        results: [],
        message: "No places found matching your criteria along this route",
      });
    }

    // Step 3: Calculate detour times
    const placesWithDetour = await Promise.all(
      places.map(async (place) => {
        try {
          const location = {
            lat: place.location.latitude,
            lng: place.location.longitude,
          };

          const detourRoute = await computeRouteWithWaypoint(
            origin,
            location,
            destination,
          );
          const detourSeconds =
            detourRoute.durationSeconds - primaryRoute.durationSeconds;

          return {
            place,
            detourSeconds: Math.max(0, detourSeconds),
            detourMinutes: Math.max(0, Math.round(detourSeconds / 60)),
            totalDurationSeconds: detourRoute.durationSeconds,
            detourRoute,
          };
        } catch {
          return null;
        }
      }),
    );

    const validPlaces = placesWithDetour
      .filter((p) => p !== null)
      .sort((a, b) => a.detourSeconds - b.detourSeconds);

    if (validPlaces.length === 0) {
      return res.json({
        success: true,
        primaryRoute: {
          durationSeconds: primaryRoute.durationSeconds,
          distanceMeters: primaryRoute.distanceMeters,
          encodedPolyline: primaryRoute.encodedPolyline,
        },
        results: [],
        message: "Could not calculate routes to any places.",
      });
    }

    // Step 4: AI analysis (optional)
    let rankedPlaces = validPlaces.slice(0, resultCount);

    if (useAI && isConfigured()) {
      const placesWithReviews = await Promise.all(
        rankedPlaces.map(async (item) => {
          try {
            const details = await getPlaceDetails(item.place.id);
            return {
              ...item,
              place: { ...item.place, reviews: details.reviews || [] },
            };
          } catch {
            return item;
          }
        }),
      );

      const placesForAnalysis = placesWithReviews.map((p) => p.place);
      const analyzedPlaces = await analyzeReviewsForCriteria(
        placesForAnalysis,
        query,
      );

      rankedPlaces = placesWithReviews.map((item, index) => ({
        ...item,
        place: analyzedPlaces[index],
      }));

      rankedPlaces.sort((a, b) => {
        const confA = a.place.aiConfidence ?? 0.5;
        const confB = b.place.aiConfidence ?? 0.5;
        if (Math.abs(confA - confB) > 0.1) return confB - confA;
        return a.detourSeconds - b.detourSeconds;
      });
    }

    // Step 5: Format results
    const topResults = rankedPlaces.map((item, index) => {
      const place = item.place;
      let photoUrl = null;
      if (place.photos && place.photos.length > 0) {
        photoUrl = getPhotoUrl(place.photos[0].name, 400);
      }

      return {
        rank: index + 1,
        placeId: place.id,
        name: place.displayName?.text || place.displayName,
        address: place.formattedAddress,
        location: {
          lat: place.location.latitude,
          lng: place.location.longitude,
        },
        rating: place.rating || null,
        userRatingCount: place.userRatingCount || 0,
        priceLevel: place.priceLevel || null,
        types: place.types || [],
        isOpen: place.currentOpeningHours?.openNow ?? null,
        photoUrl,
        detour: {
          minutes: item.detourMinutes,
          seconds: item.detourSeconds,
          addedText: `+${item.detourMinutes} min`,
        },
        detourRoute: {
          encodedPolyline: item.detourRoute.encodedPolyline,
          durationSeconds: item.detourRoute.durationSeconds,
          distanceMeters: item.detourRoute.distanceMeters,
        },
        aiAnalysis:
          place.aiConfidence !== undefined
            ? {
                confidence: place.aiConfidence,
                explanation: place.aiAnalysis,
              }
            : null,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&waypoints=${place.location.latitude},${place.location.longitude}&travelmode=driving`,
      };
    });

    return res.json({
      success: true,
      primaryRoute: {
        durationSeconds: primaryRoute.durationSeconds,
        distanceMeters: primaryRoute.distanceMeters,
        encodedPolyline: primaryRoute.encodedPolyline,
      },
      origin,
      destination,
      query,
      useAI,
      results: topResults,
      totalCandidatesFound: places.length,
    });
  } catch (error) {
    console.error("Optimization error:", error);
    return res.status(500).json({
      error: "Failed to optimize route",
      message: error.message,
    });
  }
}
