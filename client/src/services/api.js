/**
 * API Service
 * Handles all communication with the backend
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

/**
 * Optimize route with pit stop
 * @param {Object} params - Route optimization parameters
 * @param {Object} params.origin - { lat, lng }
 * @param {Object} params.destination - { lat, lng }
 * @param {string} params.query - Search query
 * @param {number} params.maxDetourMinutes - Maximum detour tolerance
 * @param {boolean} params.useAI - Whether to use AI analysis
 * @returns {Promise<Object>} Optimization results
 */
export async function optimizeRoute({
  origin,
  destination,
  query,
  maxDetourMinutes,
  useAI,
}) {
  const response = await fetch(`${API_BASE}/api/optimize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      origin,
      destination,
      query,
      maxDetourMinutes,
      useAI,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error: ${response.status}`);
  }

  return response.json();
}

/**
 * Geocode an address to coordinates
 * @param {string} address - Address to geocode
 * @returns {Promise<Object>} { lat, lng, formattedAddress }
 */
export async function geocodeAddress(address) {
  const response = await fetch(`${API_BASE}/api/geocode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Geocoding failed");
  }

  return response.json();
}

/**
 * Get place details
 * @param {string} placeId - Google Place ID
 * @returns {Promise<Object>} Place details
 */
export async function getPlaceDetails(placeId) {
  const response = await fetch(`${API_BASE}/api/place/${placeId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch place details");
  }

  return response.json();
}

/**
 * Health check
 * @returns {Promise<Object>} Server status
 */
export async function healthCheck() {
  const response = await fetch(`${API_BASE}/api/health`);
  return response.json();
}

export default {
  optimizeRoute,
  geocodeAddress,
  getPlaceDetails,
  healthCheck,
};
