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
} from "lucide-react";

function ResultsCarousel({
  results,
  selectedIndex,
  onSelect,
  onShowMore,
  showingAll,
}) {
  if (!results || results.length === 0) return null;

  return (
    <div className="absolute bottom-6 left-0 right-0 px-4">
      <div className="flex items-center gap-3">
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
              />
            ))}
          </div>
        </div>

        {/* Show More button */}
        {!showingAll && onShowMore && (
          <button
            onClick={onShowMore}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1 px-4 py-3 
                       rounded-xl bg-dark-700/80 border border-glass-border 
                       hover:bg-accent/20 hover:border-accent/50 transition-all duration-200"
          >
            <ChevronRight className="w-5 h-5 text-accent-light" />
            <span className="text-xs text-gray-400 whitespace-nowrap">
              More
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result, index, isSelected, onClick }) {
  const handleOpenMaps = (e) => {
    e.stopPropagation();
    window.open(result.googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  // Calculate total travel time in minutes
  const totalTravelMinutes = Math.round(
    result.detourRoute.durationSeconds / 60,
  );
  const hours = Math.floor(totalTravelMinutes / 60);
  const minutes = totalTravelMinutes % 60;
  const totalTimeDisplay =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;

  // Ensure detour is always positive for display
  const detourMinutes = Math.max(0, result.detour.minutes);
  const detourDisplay = `+${detourMinutes} min`;

  return (
    <div
      onClick={onClick}
      className={`
        glass-card cursor-pointer flex-shrink-0
        w-64 p-4 space-y-2.5
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
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/30 text-accent-light text-sm font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <h3 className="font-semibold text-white truncate text-sm">
          {result.name}
        </h3>
      </div>

      {/* Time Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-accent-light" />
          <span className="text-lg font-bold text-accent-light">
            {detourDisplay}
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Timer className="w-3.5 h-3.5" />
          <span>Total: {totalTimeDisplay}</span>
        </div>
      </div>

      {/* Rating & Status */}
      <div className="flex items-center gap-3 text-xs">
        {result.rating && (
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-white font-medium">{result.rating}</span>
            <span className="text-gray-500">({result.userRatingCount})</span>
          </div>
        )}

        {result.isOpen !== null && (
          <div
            className={`flex items-center gap-1 ${result.isOpen ? "text-green-400" : "text-red-400"}`}
          >
            {result.isOpen ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Open</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" />
                <span>Closed</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Analysis - compact */}
      {/* {result.aiAnalysis && result.aiAnalysis.confidence !== null && (
        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-accent/10 border border-accent/20">
          <Sparkles className="w-3.5 h-3.5 text-accent-light flex-shrink-0" />
          <span className="text-xs text-accent-light font-medium">
            AI: {Math.round(result.aiAnalysis.confidence * 100)}%
          </span>
        </div>
      )} */}

      {/* Address */}
      <div className="flex items-start gap-1.5 text-xs text-gray-400">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span className="line-clamp-1">{result.address}</span>
      </div>

      {/* Open in Google Maps Button */}
      <button
        onClick={handleOpenMaps}
        className="w-full py-2 px-3 rounded-lg bg-accent hover:bg-accent-light 
                   text-white font-medium text-xs
                   flex items-center justify-center gap-1.5
                   transition-all duration-200"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Open in Google Maps
      </button>
    </div>
  );
}

export default ResultsCarousel;
