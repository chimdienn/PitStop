import { useState, useCallback, useRef, useEffect } from "react";
import { Crosshair, X, MapPin, Building2, Map, Navigation } from "lucide-react";

function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  onKeyPress,
  userLocation,
  isMobile = false,
}) {
  const [inputValue, setInputValue] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const sessionToken = useRef(null);

  // Initialize services
  useEffect(() => {
    if (window.google && !autocompleteService.current) {
      autocompleteService.current =
        new window.google.maps.places.AutocompleteService();
      sessionToken.current =
        new window.google.maps.places.AutocompleteSessionToken();
    }
  }, []);

  // Update input display when value changes
  useEffect(() => {
    if (value?.address) {
      setInputValue(value.address);
    } else if (!value) {
      setInputValue("");
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch predictions
  const fetchPredictions = useCallback(
    async (input) => {
      if (!input || input.length < 2 || !autocompleteService.current) {
        setPredictions([]);
        return;
      }

      setIsLoading(true);

      const request = {
        input,
        sessionToken: sessionToken.current,
        types: ["geocode", "establishment"],
      };

      // Add location bias if user location is available
      if (userLocation) {
        request.locationBias = {
          center: userLocation,
          radius: 50000, // 50km radius
        };
      }

      try {
        autocompleteService.current.getPlacePredictions(
          request,
          (results, status) => {
            setIsLoading(false);
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              results
            ) {
              setPredictions(results.slice(0, 5));
              setShowDropdown(true);
            } else {
              setPredictions([]);
            }
          },
        );
      } catch (error) {
        setIsLoading(false);
        setPredictions([]);
      }
    },
    [userLocation],
  );

  // Debounced input change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue && !value) {
        fetchPredictions(inputValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, value, fetchPredictions]);

  const handleInputChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      if (value) {
        onChange(null);
      }
      if (!newValue) {
        setPredictions([]);
        setShowDropdown(false);
      }
    },
    [value, onChange],
  );

  const handleSelectPrediction = useCallback(
    (prediction) => {
      // Initialize places service if not already
      if (!placesService.current) {
        const mapDiv = document.createElement("div");
        placesService.current = new window.google.maps.places.PlacesService(
          mapDiv,
        );
      }

      placesService.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ["geometry", "formatted_address", "name"],
          sessionToken: sessionToken.current,
        },
        (place, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place
          ) {
            onChange({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              address: place.formatted_address || place.name,
              placeId: prediction.place_id,
            });
            setInputValue(place.formatted_address || place.name);
            setPredictions([]);
            setShowDropdown(false);
            // Create new session token for next search
            sessionToken.current =
              new window.google.maps.places.AutocompleteSessionToken();
          }
        },
      );
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    onChange(null);
    setPredictions([]);
    setShowDropdown(false);
  }, [onChange]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            if (status === "OK" && results[0]) {
              const address = results[0].formatted_address;
              onChange({
                lat: latitude,
                lng: longitude,
                address: address,
                placeId: results[0].place_id,
              });
              setInputValue(address);
            } else {
              onChange({
                lat: latitude,
                lng: longitude,
                address: "Current Location",
              });
              setInputValue("Current Location");
            }
            setIsLoadingLocation(false);
            setShowDropdown(false);
          },
        );
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to get your location. Please enter an address manually.");
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [onChange]);

  const handleFocus = useCallback(() => {
    if (predictions.length > 0) {
      setShowDropdown(true);
    }
  }, [predictions]);

  // Get icon for prediction type
  const getPredictionIcon = (types) => {
    if (types?.includes("establishment")) return Building2;
    if (types?.includes("route")) return Navigation;
    if (
      types?.includes("locality") ||
      types?.includes("administrative_area_level_1")
    )
      return Map;
    return MapPin;
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={onKeyPress}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={`glass-input w-full ${inputValue ? "pr-20" : "pr-12"}`}
          autoComplete="off"
          style={{ fontSize: isMobile ? "16px" : undefined }}
        />

        {/* Buttons container with gradient fade effect */}
        <div className="absolute right-0 top-0 bottom-0 flex items-center">
          {/* Gradient fade to hide text overflow */}
          {inputValue && (
            <div
              className="w-8 h-full pointer-events-none"
              style={{
                background:
                  "linear-gradient(to right, transparent, rgba(26, 26, 36, 1) 80%)",
              }}
            />
          )}

          {/* Buttons with solid background */}
          <div className="flex items-center gap-0.5 pr-2 pl-1 h-full bg-[#1a1a24]">
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLoadingLocation}
              className="p-1.5 rounded-lg hover:bg-dark-600 text-gray-400 hover:text-accent-light transition-colors disabled:opacity-50"
              title="Use current location"
            >
              {isLoadingLocation ? (
                <div className="w-4 h-4 border-2 border-gray-500 border-t-accent-light rounded-full animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Dropdown */}
      {showDropdown && (predictions.length > 0 || isLoading) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 z-50 
           bg-[#111118] border border-glass-border 
           rounded-xl shadow-2xl overflow-hidden"
        >
          {isLoading ? (
            <div className="p-4 flex items-center justify-center gap-2 text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-500 border-t-accent-light rounded-full animate-spin" />
              <span className="text-sm">Searching...</span>
            </div>
          ) : (
            <ul className="py-1">
              {predictions.map((prediction, index) => {
                const Icon = getPredictionIcon(prediction.types);
                const mainText =
                  prediction.structured_formatting?.main_text ||
                  prediction.description;
                const secondaryText =
                  prediction.structured_formatting?.secondary_text || "";

                return (
                  <li key={prediction.place_id}>
                    <button
                      type="button"
                      onClick={() => handleSelectPrediction(prediction)}
                      className={`w-full px-4 py-3 flex items-start gap-3 text-left
                                  hover:bg-accent/10 transition-colors duration-150
                                  ${index !== predictions.length - 1 ? "border-b border-glass-border" : ""}`}
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-dark-600 flex items-center justify-center mt-0.5">
                        <Icon className="w-4 h-4 text-accent-light" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {mainText}
                        </p>
                        {secondaryText && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {secondaryText}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Powered by Google */}
          <div className="px-4 py-2 border-t border-glass-border bg-[#0a0a0f]">
            <p className="text-xs text-gray-600 text-right">
              Powered by Google
            </p>
          </div>
        </div>
      )}

      {/* Location indicator */}
      {value && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full">
          <div className="w-2 h-2 rounded-full bg-accent shadow-glow" />
        </div>
      )}
    </div>
  );
}

export default LocationAutocomplete;
