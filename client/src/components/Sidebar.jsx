import { useCallback } from "react";
import {
  MapPin,
  Navigation,
  Search,
  Fuel,
  Coffee,
  Banknote,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import LocationAutocomplete from "./LocationAutocomplete";

const QUICK_CHIPS = [
  { label: "Fuel", icon: Fuel, query: "gas station" },
  { label: "Coffee", icon: Coffee, query: "coffee shop" },
  { label: "ATM", icon: Banknote, query: "ATM" },
];

function Sidebar({
  origin,
  setOrigin,
  destination,
  setDestination,
  query,
  setQuery,
  useAI,
  setUseAI,
  onSearch,
  onChipSelect,
  onClear,
  isLoading,
  hasResults,
  error,
}) {
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      onSearch();
    },
    [onSearch],
  );

  const handleChipClick = useCallback(
    (chipQuery) => {
      onChipSelect(chipQuery);
    },
    [onChipSelect],
  );

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !isLoading) {
        onSearch();
      }
    },
    [onSearch, isLoading],
  );

  return (
    <aside className="w-96 h-full flex flex-col bg-dark-800/80 backdrop-blur-xl border-r border-glass-border">
      {/* Header */}
      <div className="p-6 border-b border-glass-border">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Navigation className="w-5 h-5 text-accent-light" />
          </div>
          Pit Stop
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Find the best stops along your route
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 overflow-y-auto p-6 space-y-5"
      >
        {/* Origin */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-500" />
            Start Location
          </label>
          <LocationAutocomplete
            value={origin}
            onChange={setOrigin}
            placeholder="Enter starting point..."
            onKeyPress={handleKeyPress}
          />
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />
            End Location
          </label>
          <LocationAutocomplete
            value={destination}
            onChange={setDestination}
            placeholder="Enter destination..."
            onKeyPress={handleKeyPress}
          />
        </div>

        {/* Pit Stop Query */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <Search className="w-4 h-4 text-accent-light" />
            What do you need?
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Starbucks, gas station, toilet..."
            className="glass-input w-full"
          />
        </div>

        {/* Quick Chips */}
        <div className="flex flex-wrap gap-2">
          {QUICK_CHIPS.map(({ label, icon: Icon, query: chipQuery }) => (
            <button
              key={label}
              type="button"
              onClick={() => handleChipClick(chipQuery)}
              className={`chip flex items-center gap-2 ${
                query === chipQuery ? "chip-active" : ""
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* AI Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-700/50 border border-glass-border">
          <input
            type="checkbox"
            id="useAI"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
            className="w-4 h-4 rounded accent-accent cursor-pointer"
          />
          <label
            htmlFor="useAI"
            className="flex items-center gap-2 cursor-pointer flex-1"
          >
            <Sparkles className="w-4 h-4 text-accent-light" />
            <span className="text-sm text-gray-300">AI-powered search</span>
          </label>
          <span className="text-xs text-gray-500">Analyzes reviews</span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3 pt-4">
          <button
            type="submit"
            disabled={isLoading || !origin || !destination || !query.trim()}
            className="glass-button w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Finding best routes...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Find Best Route
              </>
            )}
          </button>

          {hasResults && (
            <button
              type="button"
              onClick={onClear}
              className="w-full py-3 rounded-xl border border-glass-border text-gray-400 
                         hover:text-white hover:bg-glass-light transition-all duration-200
                         flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              New Search
            </button>
          )}
        </div>
      </form>

      {/* Footer */}
      <div className="p-4 border-t border-glass-border">
        <p className="text-xs text-gray-600 text-center">
          Powered by Google Maps & AI
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
