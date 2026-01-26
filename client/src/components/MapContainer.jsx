import { useCallback, useState, useMemo, useEffect } from "react";
import { GoogleMap, Polyline, Marker } from "@react-google-maps/api";
import polyline from "polyline-encoded";

// Dark mode map styles
const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#1a1a24" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a24" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#1f2937" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4b5563" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#32324a" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2937" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#4b5563" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#374151" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d1d5db" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#374151" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#374151" }],
  },
];

const DEFAULT_CENTER = { lat: 1.3521, lng: 103.8198 }; // Singapore
const DEFAULT_ZOOM = 12;

function MapContainer({
  origin,
  destination,
  primaryRoute,
  selectedResult,
  results,
  selectedIndex,
  onSelectResult,
}) {
  const [map, setMap] = useState(null);

  // Decode polylines for all results
  const decodedRoutes = useMemo(() => {
    if (!results) return [];
    return results.map((result) => {
      if (!result?.detourRoute?.encodedPolyline) return [];
      try {
        return polyline
          .decode(result.detourRoute.encodedPolyline)
          .map(([lat, lng]) => ({ lat, lng }));
      } catch {
        return [];
      }
    });
  }, [results]);

  // Calculate map bounds
  const bounds = useMemo(() => {
    if (!origin && !destination) return null;

    const points = [];
    if (origin) points.push(origin);
    if (destination) points.push(destination);
    if (selectedResult?.location) points.push(selectedResult.location);

    if (points.length === 0) return null;

    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => {
      bounds.extend(new window.google.maps.LatLng(point.lat, point.lng));
    });

    return bounds;
  }, [origin, destination, selectedResult?.location]);

  // Fit bounds when they change
  const onLoad = useCallback(
    (mapInstance) => {
      setMap(mapInstance);
      if (bounds) {
        mapInstance.fitBounds(bounds, { padding: 100 });
      }
    },
    [bounds],
  );

  // Update bounds when routes change
  useEffect(() => {
    if (map && bounds) {
      map.fitBounds(bounds, { padding: 100 });
    }
  }, [map, bounds]);

  const mapOptions = useMemo(
    () => ({
      styles: MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: "greedy",
    }),
    [],
  );

  // Custom marker icons
  const originIcon = useMemo(
    () => ({
      path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
      fillColor: "#22c55e",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      scale: 8,
    }),
    [],
  );

  const destinationIcon = useMemo(
    () => ({
      path: window.google?.maps?.SymbolPath?.CIRCLE || 0,
      fillColor: "#ef4444",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      scale: 8,
    }),
    [],
  );

  // Handle marker click
  const handleMarkerClick = useCallback(
    (index) => {
      onSelectResult(index);
    },
    [onSelectResult],
  );

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={origin || destination || DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      options={mapOptions}
      onLoad={onLoad}
    >
      {/* Render all route polylines */}
      {decodedRoutes.map((path, index) => {
        if (path.length === 0) return null;

        const isSelected = index === selectedIndex;

        return (
          <Polyline
            key={`route-${index}`}
            path={path}
            options={{
              strokeColor: isSelected ? "#a78bfa" : "#4b5563",
              strokeOpacity: isSelected ? 1 : 0.4,
              strokeWeight: isSelected ? 5 : 3,
              zIndex: isSelected ? 10 : 1,
            }}
          />
        );
      })}

      {/* Glow effect for selected route */}
      {decodedRoutes[selectedIndex] &&
        decodedRoutes[selectedIndex].length > 0 && (
          <Polyline
            path={decodedRoutes[selectedIndex]}
            options={{
              strokeColor: "#7c3aed",
              strokeOpacity: 0.3,
              strokeWeight: 12,
              zIndex: 9,
            }}
          />
        )}

      {/* Origin Marker */}
      {origin && (
        <Marker
          position={{ lat: origin.lat, lng: origin.lng }}
          icon={originIcon}
          title="Start"
          zIndex={100}
        />
      )}

      {/* Destination Marker */}
      {destination && (
        <Marker
          position={{ lat: destination.lat, lng: destination.lng }}
          icon={destinationIcon}
          title="End"
          zIndex={100}
        />
      )}

      {/* Pit Stop Markers */}
      {results?.map((result, index) => {
        const isSelected = index === selectedIndex;

        return (
          <Marker
            key={result.placeId}
            position={result.location}
            onClick={() => handleMarkerClick(index)}
            label={{
              text: String(index + 1),
              color: isSelected ? "#ffffff" : "#9ca3af",
              fontWeight: "bold",
              fontSize: "14px",
            }}
            icon={{
              path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
              fillColor: isSelected ? "#7c3aed" : "#374151",
              fillOpacity: 1,
              strokeColor: isSelected ? "#a78bfa" : "#6b7280",
              strokeWeight: 2,
              scale: isSelected ? 1.8 : 1.4,
              anchor: new window.google.maps.Point(12, 22),
              labelOrigin: new window.google.maps.Point(12, 9),
            }}
            zIndex={isSelected ? 50 : 20}
          />
        );
      })}
    </GoogleMap>
  );
}

export default MapContainer;
