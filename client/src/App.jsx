import { useState, useCallback, useEffect } from "react";
import { LoadScript } from "@react-google-maps/api";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import Sidebar from "./components/Sidebar";
import MapContainer from "./components/MapContainer";
import ResultsCarousel from "./components/ResultsCarousel";
import LoadingOverlay from "./components/LoadingOverlay";
import { optimizeRoute } from "./services/api";

const GOOGLE_MAPS_LIBRARIES = ["places"];
const STORAGE_KEY = "pitstop_route_history";
const MAX_HISTORY_ITEMS = 20;
const RESULTS_INCREMENT = 5;
const MAX_DISPLAYED_RESULTS = 20;

// Custom hook for responsive detection
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = (e) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Responsive breakpoints
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1024px)");

  // Form state
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [query, setQuery] = useState("");
  const [useAI, setUseAI] = useState(false);

  // Results state
  const [allResults, setAllResults] = useState(null);
  const [displayCount, setDisplayCount] = useState(RESULTS_INCREMENT);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [primaryRoute, setPrimaryRoute] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Route history state
  const [routeHistory, setRouteHistory] = useState([]);

  // Close sidebar by default on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [isMobile, sidebarOpen]);

  // Load route history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setRouteHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load route history:", e);
    }
  }, []);

  // Save to history
  const saveToHistory = useCallback((searchData) => {
    const newItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      origin: searchData.origin,
      destination: searchData.destination,
      originAddress: searchData.originAddress,
      destinationAddress: searchData.destinationAddress,
      query: searchData.query,
      useAI: searchData.useAI,
    };

    setRouteHistory((prev) => {
      const updated = [
        newItem,
        ...prev.filter(
          (item) =>
            !(
              item.originAddress === newItem.originAddress &&
              item.destinationAddress === newItem.destinationAddress &&
              item.query === newItem.query
            ),
        ),
      ].slice(0, MAX_HISTORY_ITEMS);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save route history:", e);
      }

      return updated;
    });
  }, []);

  const handleLoadHistory = useCallback((item) => {
    setOrigin({ ...item.origin, address: item.originAddress });
    setDestination({ ...item.destination, address: item.destinationAddress });
    setQuery(item.query);
    setUseAI(item.useAI || false);
  }, []);

  const handleDeleteHistory = useCallback((id) => {
    setRouteHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save route history:", e);
      }
      return updated;
    });
  }, []);

  const handleClearAllHistory = useCallback(() => {
    setRouteHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear route history:", e);
    }
  }, []);

  // Detect user location
  useEffect(() => {
    const detectUserLocation = async () => {
      try {
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
                return;
              }
            }
          } catch (e) {
            continue;
          }
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
            },
            () => {},
            { timeout: 5000, maximumAge: 300000 },
          );
        }
      } catch (error) {
        console.log("Could not detect user location:", error);
      }
    };

    detectUserLocation();
  }, []);

  const displayedResults = allResults
    ? allResults.slice(0, Math.min(displayCount, allResults.length))
    : null;

  const canShowMore =
    allResults &&
    displayCount < Math.min(allResults.length, MAX_DISPLAYED_RESULTS);
  const canShowLess = displayCount > RESULTS_INCREMENT;

  const handleSearch = useCallback(async () => {
    if (!origin || !destination || !query.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAllResults(null);
    setDisplayCount(RESULTS_INCREMENT);

    // Close sidebar on mobile after search
    if (isMobile) {
      setSidebarOpen(false);
    }

    try {
      const response = await optimizeRoute({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        query: query.trim(),
        maxResults: MAX_DISPLAYED_RESULTS,
        useAI: useAI,
      });

      if (response.success) {
        setPrimaryRoute(response.primaryRoute);
        setAllResults(response.results);
        setSelectedResultIndex(0);

        saveToHistory({
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          originAddress: origin.address,
          destinationAddress: destination.address,
          query: query.trim(),
          useAI,
        });

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
  }, [origin, destination, query, useAI, saveToHistory, isMobile]);

  const handleChipSelect = useCallback((chipQuery) => {
    setQuery(chipQuery);
  }, []);

  const handleResultSelect = useCallback((index) => {
    setSelectedResultIndex(index);
  }, []);

  const handleShowMore = useCallback(() => {
    setDisplayCount((prev) =>
      Math.min(prev + RESULTS_INCREMENT, MAX_DISPLAYED_RESULTS),
    );
  }, []);

  const handleShowLess = useCallback(() => {
    setDisplayCount((prev) => {
      const newCount = Math.max(prev - RESULTS_INCREMENT, RESULTS_INCREMENT);
      if (selectedResultIndex >= newCount) {
        setSelectedResultIndex(newCount - 1);
      }
      return newCount;
    });
  }, [selectedResultIndex]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-dark-900 p-4 md:p-8">
        <div className="glass-card p-6 md:p-8 max-w-md text-center">
          <h1 className="text-xl md:text-2xl font-bold text-red-400 mb-4">
            Configuration Error
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Google Maps API key is not configured. Please add{" "}
            <code className="text-accent bg-dark-700 px-2 py-1 rounded text-xs md:text-sm">
              VITE_GOOGLE_MAPS_API_KEY
            </code>{" "}
            to your{" "}
            <code className="text-accent bg-dark-700 px-2 py-1 rounded text-xs md:text-sm">
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
        {/* Mobile Menu Button */}
        {isMobile && !sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="fixed top-4 left-4 z-30 p-3 rounded-xl bg-dark-800/90 border border-glass-border
                       shadow-lg backdrop-blur-sm
                       hover:bg-accent/20 hover:border-accent/50 transition-all duration-200"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Desktop Sidebar */}
        {!isMobile && (
          <>
            <div
              className={`h-full transition-all duration-300 ease-in-out ${
                sidebarOpen ? (isTablet ? "w-80" : "w-96") : "w-0"
              } overflow-hidden`}
            >
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
                isLoading={isLoading}
                error={error}
                userLocation={userLocation}
                routeHistory={routeHistory}
                onLoadHistory={handleLoadHistory}
                onDeleteHistory={handleDeleteHistory}
                onClearAllHistory={handleClearAllHistory}
                isMobile={false}
                isTablet={isTablet}
                onClose={() => setSidebarOpen(false)}
              />
            </div>

            {/* Desktop Toggle Button */}
            <button
              onClick={toggleSidebar}
              className={`absolute z-20 top-1/2 -translate-y-1/2 
                         w-6 h-16 flex items-center justify-center
                         bg-dark-800 border border-glass-border rounded-r-lg
                         hover:bg-accent/20 hover:border-accent/50
                         transition-all duration-300 ease-in-out
                         ${sidebarOpen ? (isTablet ? "left-80" : "left-96") : "left-0"}`}
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </>
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 z-40">
            {/* Backdrop */}
            <div
              className="absolute inset-0 mobile-overlay-backdrop"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar */}
            <div className="absolute inset-y-0 left-0 w-full max-w-sm slide-in-left safe-area-top">
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
                isLoading={isLoading}
                error={error}
                userLocation={userLocation}
                routeHistory={routeHistory}
                onLoadHistory={handleLoadHistory}
                onDeleteHistory={handleDeleteHistory}
                onClearAllHistory={handleClearAllHistory}
                isMobile={true}
                isTablet={false}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}

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

          {displayedResults && displayedResults.length > 0 && (
            <ResultsCarousel
              results={displayedResults}
              selectedIndex={selectedResultIndex}
              onSelect={handleResultSelect}
              onShowMore={canShowMore ? handleShowMore : null}
              onShowLess={canShowLess ? handleShowLess : null}
              displayCount={displayCount}
              totalResults={allResults?.length || 0}
              isMobile={isMobile}
              isTablet={isTablet}
            />
          )}

          {isLoading && <LoadingOverlay />}
        </div>
      </div>
    </LoadScript>
  );
}

export default App;
