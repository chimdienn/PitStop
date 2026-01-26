import { useState, useCallback } from "react";
import { LoadScript } from "@react-google-maps/api";
import Sidebar from "./components/Sidebar";
import MapContainer from "./components/MapContainer";
import ResultsCarousel from "./components/ResultsCarousel";
import LoadingOverlay from "./components/LoadingOverlay";
import { optimizeRoute } from "./services/api";

const GOOGLE_MAPS_LIBRARIES = ["places"];

function App() {
  // Form state
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [query, setQuery] = useState("");
  const [maxDetour, setMaxDetour] = useState(12);
  const [useAI, setUseAI] = useState(false);

  // Results state
  const [results, setResults] = useState(null);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [primaryRoute, setPrimaryRoute] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle form submission
  const handleSearch = useCallback(async () => {
    if (!origin || !destination || !query.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await optimizeRoute({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        query: query.trim(),
        maxDetourMinutes: maxDetour,
        useAI: useAI,
      });

      if (response.success) {
        setPrimaryRoute(response.primaryRoute);
        setResults(response.results);
        setSelectedResultIndex(0);

        if (response.results.length === 0) {
          setError(
            response.message || "No results found within your detour tolerance",
          );
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
  }, [origin, destination, query, maxDetour, useAI]);

  // Handle quick chip selection
  const handleChipSelect = useCallback((chipQuery) => {
    setQuery(chipQuery);
  }, []);

  // Handle result selection (from carousel or map)
  const handleResultSelect = useCallback((index) => {
    setSelectedResultIndex(index);
  }, []);

  // Clear results and start over
  const handleClear = useCallback(() => {
    setResults(null);
    setPrimaryRoute(null);
    setSelectedResultIndex(0);
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
          maxDetour={maxDetour}
          setMaxDetour={setMaxDetour}
          useAI={useAI}
          setUseAI={setUseAI}
          onSearch={handleSearch}
          onChipSelect={handleChipSelect}
          onClear={handleClear}
          isLoading={isLoading}
          hasResults={results !== null}
          error={error}
        />

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapContainer
            origin={origin}
            destination={destination}
            primaryRoute={primaryRoute}
            selectedResult={results?.[selectedResultIndex] || null}
            results={results}
            selectedIndex={selectedResultIndex}
            onSelectResult={handleResultSelect}
          />

          {/* Results Carousel */}
          {results && results.length > 0 && (
            <ResultsCarousel
              results={results}
              selectedIndex={selectedResultIndex}
              onSelect={handleResultSelect}
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
