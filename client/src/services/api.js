const API_BASE = import.meta.env.VITE_API_URL || "";

export async function optimizeRoute({
  origin,
  destination,
  query,
  maxResults = 20,
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
      maxResults,
      useAI,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error: ${response.status}`);
  }

  return response.json();
}

export async function geocodeAddress(address) {
  const response = await fetch(`${API_BASE}/api/geocode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Geocoding failed");
  }

  return response.json();
}

export async function getPlaceDetails(placeId) {
  const response = await fetch(`${API_BASE}/api/place/${placeId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to fetch place details");
  }

  return response.json();
}

export async function healthCheck() {
  const response = await fetch(`${API_BASE}/api/health`);
  return response.json();
}

export default { optimizeRoute, geocodeAddress, getPlaceDetails, healthCheck };
