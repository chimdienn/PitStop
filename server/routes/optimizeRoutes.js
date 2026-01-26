import express from "express";
import * as googleMapsService from "../services/googleMapsService.js";
import * as geminiService from "../services/geminiService.js";

const router = express.Router();

router.post("/optimize", async (req, res) => {
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

    console.log(`\n🔍 Optimization request:`);
    console.log(`   Origin: ${JSON.stringify(origin)}`);
    console.log(`   Destination: ${JSON.stringify(destination)}`);
    console.log(`   Query: "${query}"`);
    console.log(`   Max results: ${resultCount}`);
    console.log(`   Use AI: ${useAI}`);

    let originCoords = origin;
    let destinationCoords = destination;

    if (typeof origin === "string") {
      console.log("📍 Geocoding origin address...");
      const geocoded = await googleMapsService.geocodeAddress(origin);
      originCoords = { lat: geocoded.lat, lng: geocoded.lng };
    }

    if (typeof destination === "string") {
      console.log("📍 Geocoding destination address...");
      const geocoded = await googleMapsService.geocodeAddress(destination);
      destinationCoords = { lat: geocoded.lat, lng: geocoded.lng };
    }

    // STEP 1: Get the primary route (A -> B)
    console.log("\n📏 Step 1: Computing primary route...");
    const primaryRoute = await googleMapsService.computeRoute(
      originCoords,
      destinationCoords,
    );
    console.log(
      `   Duration: ${Math.round(primaryRoute.durationSeconds / 60)} minutes`,
    );
    console.log(
      `   Distance: ${(primaryRoute.distanceMeters / 1000).toFixed(1)} km`,
    );

    // STEP 2: Search for places along the route
    console.log("\n🔎 Step 2: Searching for places along route...");
    const places = await googleMapsService.searchPlacesAlongRoute(
      query,
      primaryRoute.encodedPolyline,
      25, // Get more results for better selection
    );
    console.log(`   Found ${places.length} potential stops`);

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

    // STEP 3: Calculate detour time for each place
    console.log("\n⏱️  Step 3: Calculating detour times...");
    const placesWithDetour = await Promise.all(
      places.map(async (place) => {
        try {
          const location = {
            lat: place.location.latitude,
            lng: place.location.longitude,
          };

          const detourRoute = await googleMapsService.computeRouteWithWaypoint(
            originCoords,
            location,
            destinationCoords,
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
        } catch (error) {
          console.error(
            `   Error calculating detour for ${place.displayName?.text}:`,
            error.message,
          );
          return null;
        }
      }),
    );

    // Filter out failed calculations and sort by detour time (ascending)
    const validPlaces = placesWithDetour
      .filter((p) => p !== null)
      .sort((a, b) => a.detourSeconds - b.detourSeconds);

    console.log(`   ${validPlaces.length} valid places calculated`);

    if (validPlaces.length === 0) {
      return res.json({
        success: true,
        primaryRoute: {
          durationSeconds: primaryRoute.durationSeconds,
          distanceMeters: primaryRoute.distanceMeters,
          encodedPolyline: primaryRoute.encodedPolyline,
        },
        results: [],
        message: "Could not calculate routes to any places. Please try again.",
      });
    }

    // STEP 4: AI analysis (if enabled)
    let rankedPlaces = validPlaces.slice(0, resultCount);

    if (useAI && geminiService.isConfigured()) {
      console.log("\n🤖 Step 4: AI analysis enabled by user...");

      const placesWithReviews = await Promise.all(
        rankedPlaces.map(async (item) => {
          try {
            const details = await googleMapsService.getPlaceDetails(
              item.place.id,
            );
            return {
              ...item,
              place: { ...item.place, reviews: details.reviews || [] },
            };
          } catch (error) {
            return item;
          }
        }),
      );

      const placesForAnalysis = placesWithReviews.map((p) => p.place);
      const analyzedPlaces = await geminiService.analyzeReviewsForCriteria(
        placesForAnalysis,
        query,
      );

      rankedPlaces = placesWithReviews.map((item, index) => ({
        ...item,
        place: analyzedPlaces[index],
      }));

      // Sort by AI confidence first, then by detour time
      rankedPlaces.sort((a, b) => {
        const confA = a.place.aiConfidence ?? 0.5;
        const confB = b.place.aiConfidence ?? 0.5;

        if (Math.abs(confA - confB) > 0.1) {
          return confB - confA;
        }
        return a.detourSeconds - b.detourSeconds;
      });

      console.log("   AI analysis complete");
    } else if (useAI && !geminiService.isConfigured()) {
      console.log("\n⚠️  Step 4: AI requested but Gemini not configured");
    } else {
      console.log("\n⏭️  Step 4: AI analysis not requested");
    }

    // STEP 5: Format results
    console.log("\n✅ Step 5: Preparing results...");
    const topResults = rankedPlaces.map((item, index) => {
      const place = item.place;

      let photoUrl = null;
      if (place.photos && place.photos.length > 0) {
        photoUrl = googleMapsService.getPhotoUrl(place.photos[0].name, 400);
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
        googleMapsUrl: generateGoogleMapsUrl(
          originCoords,
          item.place,
          destinationCoords,
        ),
      };
    });

    console.log(`   Returning ${topResults.length} optimized results`);

    res.json({
      success: true,
      primaryRoute: {
        durationSeconds: primaryRoute.durationSeconds,
        distanceMeters: primaryRoute.distanceMeters,
        encodedPolyline: primaryRoute.encodedPolyline,
      },
      origin: originCoords,
      destination: destinationCoords,
      query,
      useAI,
      results: topResults,
      totalCandidatesFound: places.length,
    });
  } catch (error) {
    console.error("❌ Optimization error:", error);
    res.status(500).json({
      error: "Failed to optimize route",
      message: error.message,
    });
  }
});

router.post("/geocode", async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }
    const result = await googleMapsService.geocodeAddress(address);
    res.json(result);
  } catch (error) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: "Geocoding failed", message: error.message });
  }
});

router.get("/place/:placeId", async (req, res) => {
  try {
    const { placeId } = req.params;
    const details = await googleMapsService.getPlaceDetails(placeId);
    res.json(details);
  } catch (error) {
    console.error("Place details error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch place details", message: error.message });
  }
});

function generateGoogleMapsUrl(origin, place, destination) {
  const originStr = `${origin.lat},${origin.lng}`;
  const waypointLat = place.location?.latitude || place.location?.lat;
  const waypointLng = place.location?.longitude || place.location?.lng;
  const waypointStr = `${waypointLat},${waypointLng}`;
  const destStr = `${destination.lat},${destination.lng}`;

  return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&waypoints=${waypointStr}&travelmode=driving`;
}

export default router;
