import { useState } from "react";
import {
  Star,
  Clock,
  ExternalLink,
  Sparkles,
  MapPin,
  CheckCircle,
  XCircle,
  Timer,
  ChevronRight,
  ChevronLeft,
  Search,
  Navigation,
} from "lucide-react";

function ResultsCarousel({
  results,
  selectedIndex,
  onSelect,
  onShowMore,
  onShowLess,
  displayCount,
  totalResults,
}) {
  const [hoveredResult, setHoveredResult] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  if (!results || results.length === 0) return null;

  const handleMouseEnter = (result, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setHoveredResult(result);
  };

  const handleMouseLeave = () => {
    setHoveredResult(null);
  };

  return (
    <div className="absolute bottom-6 left-0 right-0 px-4">
      {/* Hover Tooltip - Rendered outside scroll container */}
      {hoveredResult && (
        <HoverTooltip result={hoveredResult} position={tooltipPosition} />
      )}

      <div className="flex items-center gap-2">
        {/* Less button */}
        {onShowLess && (
          <button
            onClick={onShowLess}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-3 
                       rounded-xl bg-dark-700/90 border border-glass-border 
                       hover:bg-accent/20 hover:border-accent/50 transition-all duration-200"
            title="Show less"
          >
            <ChevronLeft className="w-5 h-5 text-accent-light" />
            <span className="text-xs text-gray-400">Less</span>
          </button>
        )}

        {/* Scrollable cards container */}
        <div className="flex-1 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-3 w-max">
            {results.map((result, index) => (
              <ResultCard
                key={result.placeId}
                result={result}
                index={index}
                isSelected={index === selectedIndex}
                onClick={() => onSelect(index)}
                onMouseEnter={(e) => handleMouseEnter(result, e)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </div>
        </div>

        {/* More button */}
        {onShowMore && (
          <button
            onClick={onShowMore}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-3 
                       rounded-xl bg-dark-700/90 border border-glass-border 
                       hover:bg-accent/20 hover:border-accent/50 transition-all duration-200"
            title="Show more"
          >
            <ChevronRight className="w-5 h-5 text-accent-light" />
            <span className="text-xs text-gray-400">More</span>
          </button>
        )}
      </div>

      {/* Results count indicator */}
      <div className="text-center mt-2">
        <span className="text-xs text-gray-500">
          Showing {results.length} of {totalResults} results
        </span>
      </div>
    </div>
  );
}

function HoverTooltip({ result, position }) {
  const totalTravelMinutes = Math.round(
    result.detourRoute.durationSeconds / 60,
  );
  const hours = Math.floor(totalTravelMinutes / 60);
  const minutes = totalTravelMinutes % 60;
  const totalTimeDisplay =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  const detourMinutes = Math.max(0, result.detour.minutes);
  const detourDisplay = `+${detourMinutes} min`;

  return (
    <div
      className="fixed z-[100] w-72 bg-[#111118] border border-glass-border rounded-xl shadow-2xl animate-fadeIn pointer-events-none"
      style={{
        left: position.x,
        top: position.y - 12,
        transform: "translate(-50%, -100%)",
      }}
    >
      {/* Photo */}
      {result.photoUrl && (
        <div className="h-32 w-full overflow-hidden rounded-t-xl">
          <img
            src={result.photoUrl}
            alt={result.name}
            className="w-full h-full object-cover"
            onError={(e) => (e.target.style.display = "none")}
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Full Name */}
        <h4 className="font-semibold text-white text-sm leading-tight">
          {result.name}
        </h4>

        {/* Full Address */}
        <div className="flex items-start gap-2 text-xs text-gray-400">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-accent-light" />
          <span>{result.address}</span>
        </div>

        {/* Rating Details */}
        {result.rating && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              <span className="text-white font-medium">{result.rating}</span>
            </div>
            <span className="text-gray-500">
              ({result.userRatingCount?.toLocaleString() || 0} reviews)
            </span>
            {result.isOpen !== null && (
              <span
                className={`ml-auto ${result.isOpen ? "text-green-400" : "text-red-400"}`}
              >
                {result.isOpen ? "● Open" : "● Closed"}
              </span>
            )}
          </div>
        )}

        {/* AI Analysis */}
        {result.aiAnalysis && result.aiAnalysis.confidence !== null && (
          <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent-light" />
              <span className="text-xs text-accent-light font-medium">
                AI Confidence: {Math.round(result.aiAnalysis.confidence * 100)}%
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {result.aiAnalysis.explanation}
            </p>
          </div>
        )}

        {/* Time Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-glass-border">
          <div className="flex items-center gap-1.5 text-accent-light">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm font-semibold">{detourDisplay}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <Timer className="w-3.5 h-3.5" />
            <span>Total trip: {totalTimeDisplay}</span>
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 
                   bg-[#111118] border-r border-b border-glass-border"
      />
    </div>
  );
}

function ResultCard({
  result,
  index,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) {
  const handleOpenMaps = (e) => {
    e.stopPropagation();
    window.open(result.googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenSearch = (e) => {
    e.stopPropagation();
    const searchQuery = encodeURIComponent(`${result.name} ${result.address}`);
    window.open(
      `https://www.google.com/search?q=${searchQuery}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const totalTravelMinutes = Math.round(
    result.detourRoute.durationSeconds / 60,
  );
  const hours = Math.floor(totalTravelMinutes / 60);
  const minutes = totalTravelMinutes % 60;
  const totalTimeDisplay =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;

  const detourMinutes = Math.max(0, result.detour.minutes);
  const detourDisplay = `+${detourMinutes} min`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        glass-card cursor-pointer flex-shrink-0
        w-56 p-3 space-y-2
        transition-all duration-300 ease-out
        ${
          isSelected
            ? "ring-2 ring-accent shadow-glow-lg scale-105"
            : "hover:scale-[1.02] opacity-80 hover:opacity-100"
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/30 text-accent-light text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <h3 className="font-semibold text-white truncate text-sm">
          {result.name}
        </h3>
      </div>

      {/* Time Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-accent-light" />
          <span className="text-base font-bold text-accent-light">
            {detourDisplay}
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Timer className="w-3 h-3" />
          <span>{totalTimeDisplay}</span>
        </div>
      </div>

      {/* Rating & Status */}
      <div className="flex items-center gap-2 text-xs">
        {result.rating && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-white font-medium">{result.rating}</span>
          </div>
        )}

        {result.isOpen !== null && (
          <div
            className={`flex items-center gap-1 ${result.isOpen ? "text-green-400" : "text-red-400"}`}
          >
            {result.isOpen ? (
              <>
                <CheckCircle className="w-3 h-3" />
                <span>Open</span>
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                <span>Closed</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Analysis - compact */}
      {result.aiAnalysis && result.aiAnalysis.confidence !== null && (
        <div className="flex items-center gap-1 text-xs">
          <Sparkles className="w-3 h-3 text-accent-light" />
          <span className="text-accent-light font-medium">
            AI: {Math.round(result.aiAnalysis.confidence * 100)}%
          </span>
        </div>
      )}

      {/* Address */}
      <div className="text-xs text-gray-400 truncate">{result.address}</div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleOpenMaps}
          className="flex-1 py-1.5 px-2 rounded-lg bg-accent hover:bg-accent-light 
                     text-white font-medium text-xs
                     flex items-center justify-center gap-1
                     transition-all duration-200"
          title="Open route in Google Maps"
        >
          <Navigation className="w-3 h-3" />
          Route
        </button>
        <button
          onClick={handleOpenSearch}
          className="flex-1 py-1.5 px-2 rounded-lg bg-dark-600 hover:bg-dark-500
                     text-gray-300 hover:text-white font-medium text-xs
                     flex items-center justify-center gap-1 border border-glass-border
                     transition-all duration-200"
          title="Search on Google"
        >
          <Search className="w-3 h-3" />
          Search
        </button>
      </div>
    </div>
  );
}

export default ResultsCarousel;
