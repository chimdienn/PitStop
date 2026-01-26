import { useState, useCallback, useEffect } from "react";
import { LoadScript } from "@react-google-maps/api";
import Sidebar from "./components/Sidebar";
import MapContainer from "./components/MapContainer";
import ResultsCarousel from "./components/ResultsCarousel";
import LoadingOverlay from "./components/LoadingOverlay";
import { optimizeRoute } from "./services/api";

const GOOGLE_MAPS_LIBRARIES = ["places"];

function App() {
  // User location state (detected via IP)
  const [userLocation, setUserLocation] = useState(null);

  // Form state
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [query, setQuery] = useState("");
  const [useAI, setUseAI] = useState(false);

  // Results state
  const [allResults, setAllResults] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [primaryRoute, setPrimaryRoute] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Detect user location via IP on mount
  useEffect(() => {
    const detectUserLocation = async () => {
      try {
        // Try multiple IP geolocation services
        const services = [
          "https://ipapi.co/json/",
          "https://ip-api.com/json/?fields=lat,lon",
        ];

        for (const url of services) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              const lat = data.latitude || data.lat;
              const lng = data.longitude || data.lon;

              if (lat && lng) {
                setUserLocation({ lat, lng });
                console.log("User location detected:", { lat, lng });
                return;
              }
            }
          } catch (e) {
            continue;
          }
        }

        // Fallback: try browser geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            () => {
              // Silent fail - will use default location
              console.log("Geolocation not available, using default location");
            },
            { timeout: 5000, maximumAge: 300000 },
          );
        }
      } catch (error) {
        console.log("Could not detect user location:", error);
      }
    };

    detectUserLocation();
  }, []);

  // Get displayed results (5 or 10)
  const displayedResults = allResults
    ? showAll
      ? allResults
      : allResults.slice(0, 5)
    : null;

  // Handle form submission
  const handleSearch = useCallback(async () => {
    if (!origin || !destination || !query.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAllResults(null);
    setShowAll(false);

    try {
      const response = await optimizeRoute({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        query: query.trim(),
        maxResults: 10,
        useAI: useAI,
      });

      if (response.success) {
        setPrimaryRoute(response.primaryRoute);
        setAllResults(response.results);
        setSelectedResultIndex(0);

        if (response.results.length === 0) {
          setError(response.message || "No results found along this route");
        }
      } else {
        setError(response.error || "Something went wrong");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(err.message || "Failed to find routes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, query, useAI]);

  // Handle quick chip selection
  const handleChipSelect = useCallback((chipQuery) => {
    setQuery(chipQuery);
  }, []);

  // Handle result selection
  const handleResultSelect = useCallback((index) => {
    setSelectedResultIndex(index);
  }, []);

  // Handle show more
  const handleShowMore = useCallback(() => {
    setShowAll(true);
  }, []);

  // Clear results
  const handleClear = useCallback(() => {
    setAllResults(null);
    setPrimaryRoute(null);
    setSelectedResultIndex(0);
    setShowAll(false);
    setError(null);
  }, []);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-dark-900 p-8">
        <div className="glass-card p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">
            Configuration Error
          </h1>
          <p className="text-gray-400">
            Google Maps API key is not configured. Please add{" "}
            <code className="text-accent bg-dark-700 px-2 py-1 rounded">
              VITE_GOOGLE_MAPS_API_KEY
            </code>{" "}
            to your{" "}
            <code className="text-accent bg-dark-700 px-2 py-1 rounded">
              .env
            </code>{" "}
            file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey} libraries={GOOGLE_MAPS_LIBRARIES}>
      <div className="h-screen w-screen flex overflow-hidden bg-dark-900">
        {/* Sidebar */}
        <Sidebar
          origin={origin}
          setOrigin={setOrigin}
          destination={destination}
          setDestination={setDestination}
          query={query}
          setQuery={setQuery}
          useAI={useAI}
          setUseAI={setUseAI}
          onSearch={handleSearch}
          onChipSelect={handleChipSelect}
          onClear={handleClear}
          isLoading={isLoading}
          hasResults={allResults !== null}
          error={error}
          userLocation={userLocation}
        />

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer
            origin={origin}
            destination={destination}
            primaryRoute={primaryRoute}
            results={displayedResults}
            selectedIndex={selectedResultIndex}
            onSelectResult={handleResultSelect}
            userLocation={userLocation}
          />

          {/* Results Carousel */}
          {displayedResults && displayedResults.length > 0 && (
            <ResultsCarousel
              results={displayedResults}
              selectedIndex={selectedResultIndex}
              onSelect={handleResultSelect}
              onShowMore={
                allResults && allResults.length > 5 ? handleShowMore : null
              }
              showingAll={showAll || (allResults && allResults.length <= 5)}
            />
          )}

          {/* Loading Overlay */}
          {isLoading && <LoadingOverlay />}
        </div>
      </div>
    </LoadScript>
  );
}

export default App;
