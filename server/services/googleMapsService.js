/**
 * Google Maps Service
 * Handles all external Google API calls securely from the backend
 */

import polyline from "polyline";

const ROUTES_API_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";
const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places";

/**
 * Compute route between two points using Google Routes API
 * @param {Object} origin - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @returns {Object} Route data including polyline and duration
 */
export async function computeRoute(origin, destination) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Google Maps API key not configured");
  }

  const requestBody = {
    origin: {
      location: {
        latLng: {
          latitude: origin.lat,
          longitude: origin.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.lat,
          longitude: destination.lng,
        },
      },
    },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false,
    },
    languageCode: "en-US",
    units: "METRIC",
  };

  const response = await fetch(ROUTES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Routes API error: ${error.error?.message || response.statusText}`,
    );
  }

  const data = await response.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error("No route found between the specified points");
  }

  const route = data.routes[0];

  return {
    encodedPolyline: route.polyline.encodedPolyline,
    durationSeconds: parseInt(route.duration.replace("s", "")),
    distanceMeters: route.distanceMeters,
    decodedPolyline: polyline.decode(route.polyline.encodedPolyline),
  };
}

/**
 * Compute route with a waypoint (for detour calculations)
 * @param {Object} origin - { lat, lng }
 * @param {Object} waypoint - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @returns {Object} Route data with detour
 */
export async function computeRouteWithWaypoint(origin, waypoint, destination) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Google Maps API key not configured");
  }

  const requestBody = {
    origin: {
      location: {
        latLng: {
          latitude: origin.lat,
          longitude: origin.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.lat,
          longitude: destination.lng,
        },
      },
    },
    intermediates: [
      {
        location: {
          latLng: {
            latitude: waypoint.lat,
            longitude: waypoint.lng,
          },
        },
      },
    ],
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
    languageCode: "en-US",
    units: "METRIC",
  };

  const response = await fetch(ROUTES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Routes API error: ${error.error?.message || response.statusText}`,
    );
  }

  const data = await response.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error("No route found with the specified waypoint");
  }

  const route = data.routes[0];

  return {
    encodedPolyline: route.polyline.encodedPolyline,
    durationSeconds: parseInt(route.duration.replace("s", "")),
    distanceMeters: route.distanceMeters,
    decodedPolyline: polyline.decode(route.polyline.encodedPolyline),
    legs: route.legs,
  };
}

/**
 * Search for places along a route using Places API (New) with searchAlongRoute
 * @param {string} query - Search query (e.g., "Starbucks", "gas station")
 * @param {string} encodedPolyline - Encoded polyline from Routes API
 * @param {number} maxResults - Maximum number of results
 * @returns {Array} Array of place results
 */
export async function searchPlacesAlongRoute(
  query,
  encodedPolyline,
  maxResults = 10,
) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Google Maps API key not configured");
  }

  const requestBody = {
    textQuery: query,
    searchAlongRouteParameters: {
      polyline: {
        encodedPolyline: encodedPolyline,
      },
    },
    maxResultCount: maxResults,
  };

  const response = await fetch(PLACES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.currentOpeningHours,places.photos,places.reviews,places.priceLevel",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Places API error: ${error.error?.message || response.statusText}`,
    );
  }

  const data = await response.json();

  return data.places || [];
}

/**
 * Get detailed information about a specific place
 * @param {string} placeId - Google Place ID
 * @returns {Object} Place details including reviews
 */
export async function getPlaceDetails(placeId) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Google Maps API key not configured");
  }

  const response = await fetch(`${PLACE_DETAILS_URL}/${placeId}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,location,rating,userRatingCount,types,currentOpeningHours,photos,reviews,priceLevel,websiteUri,nationalPhoneNumber",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Place Details API error: ${error.error?.message || response.statusText}`,
    );
  }

  return await response.json();
}

/**
 * Get photo URL for a place photo reference
 * @param {string} photoName - Photo resource name from Places API
 * @param {number} maxWidth - Maximum width in pixels
 * @returns {string} Photo URL
 */
export function getPhotoUrl(photoName, maxWidth = 400) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
}

/**
 * Geocode an address to coordinates
 * @param {string} address - Address to geocode
 * @returns {Object} { lat, lng, formattedAddress }
 */
export async function geocodeAddress(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Google Maps API key not configured");
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== "OK" || !data.results || data.results.length === 0) {
    throw new Error(`Geocoding failed: ${data.status}`);
  }

  const result = data.results[0];

  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}

export default {
  computeRoute,
  computeRouteWithWaypoint,
  searchPlacesAlongRoute,
  getPlaceDetails,
  getPhotoUrl,
  geocodeAddress,
};
