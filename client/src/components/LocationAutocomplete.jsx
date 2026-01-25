import { useState, useCallback, useRef, useEffect } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { MapPin, Crosshair, X } from "lucide-react";

function LocationAutocomplete({ value, onChange, placeholder, onKeyPress }) {
  const [inputValue, setInputValue] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const autocompleteRef = useRef(null);

  // Update input display when value changes
  useEffect(() => {
    if (value?.address) {
      setInputValue(value.address);
    } else if (!value) {
      setInputValue("");
    }
  }, [value]);

  const handleLoad = useCallback((autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const handlePlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();

      if (place.geometry?.location) {
        onChange({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address || place.name,
          placeId: place.place_id,
        });
        setInputValue(place.formatted_address || place.name);
      }
    }
  }, [onChange]);

  const handleInputChange = useCallback(
    (e) => {
      setInputValue(e.target.value);
      // Clear the selected location if user starts typing again
      if (value) {
        onChange(null);
      }
    },
    [value, onChange],
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    onChange(null);
    autocompleteRef.current = null;
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

        // Reverse geocode to get address
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

  return (
    <div className="relative">
      <Autocomplete
        onLoad={handleLoad}
        onPlaceChanged={handlePlaceChanged}
        options={{
          fields: ["place_id", "geometry", "formatted_address", "name"],
          types: ["geocode", "establishment"],
        }}
      >
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={onKeyPress}
            placeholder={placeholder}
            className="glass-input w-full pr-20"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Clear button */}
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg hover:bg-dark-600 text-gray-500 hover:text-gray-300 transition-colors"
                title="Clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Current location button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLoadingLocation}
              className="p-1.5 rounded-lg hover:bg-dark-600 text-gray-500 hover:text-accent-light transition-colors disabled:opacity-50"
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
      </Autocomplete>

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
