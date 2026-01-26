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

const DEFAULT_ZOOM = 12;

function MapContainer({
  origin,
  destination,
  primaryRoute,
  results,
  selectedIndex,
  onSelectResult,
  userLocation,
}) {
  const [map, setMap] = useState(null);

  // Get the currently selected result
  const selectedResult = results?.[selectedIndex] || null;

  // Decode polyline for selected result only
  const selectedPath = useMemo(() => {
    if (!selectedResult?.detourRoute?.encodedPolyline) return [];
    try {
      return polyline
        .decode(selectedResult.detourRoute.encodedPolyline)
        .map(([lat, lng]) => ({ lat, lng }));
    } catch {
      return [];
    }
  }, [selectedResult?.detourRoute?.encodedPolyline]);

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (origin) return { lat: origin.lat, lng: origin.lng };
    if (destination) return { lat: destination.lat, lng: destination.lng };
    if (userLocation) return userLocation;
    return { lat: 10.8231, lng: 106.6297 }; // Default to Ho Chi Minh City
  }, [origin, destination, userLocation]);

  // Calculate map bounds
  const bounds = useMemo(() => {
    if (!origin && !destination && !selectedResult) return null;

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

  const onLoad = useCallback(
    (mapInstance) => {
      setMap(mapInstance);
      if (bounds) {
        mapInstance.fitBounds(bounds, { padding: 100 });
      }
    },
    [bounds],
  );

  // Update bounds when selection changes
  useEffect(() => {
    if (map && bounds) {
      map.fitBounds(bounds, { padding: 100 });
    }
  }, [map, bounds, selectedIndex]);

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

  const handleMarkerClick = useCallback(
    (index) => {
      onSelectResult(index);
    },
    [onSelectResult],
  );

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={mapCenter}
      zoom={DEFAULT_ZOOM}
      options={mapOptions}
      onLoad={onLoad}
    >
      {/* Only render the selected route */}
      {selectedPath.length > 0 && (
        <>
          {/* Glow effect */}
          <Polyline
            key={`glow-${selectedIndex}`}
            path={selectedPath}
            options={{
              strokeColor: "#7c3aed",
              strokeOpacity: 0.3,
              strokeWeight: 12,
              zIndex: 9,
            }}
          />
          {/* Main line */}
          <Polyline
            key={`line-${selectedIndex}`}
            path={selectedPath}
            options={{
              strokeColor: "#a78bfa",
              strokeOpacity: 1,
              strokeWeight: 5,
              zIndex: 10,
            }}
          />
        </>
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
