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
  if (!results || results.length === 0) return null;

  return (
    <div className="absolute bottom-6 left-0 right-0 px-4">
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

function ResultCard({ result, index, isSelected, onClick }) {
  const handleOpenMaps = (e) => {
    e.stopPropagation();
    window.open(result.googleMapsUrl, "_blank", "noopener,noreferrer");
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

      {/* Open in Google Maps Button */}
      <button
        onClick={handleOpenMaps}
        className="w-full py-1.5 px-2 rounded-lg bg-accent hover:bg-accent-light 
                   text-white font-medium text-xs
                   flex items-center justify-center gap-1
                   transition-all duration-200"
      >
        <ExternalLink className="w-3 h-3" />
        Google Maps
      </button>
    </div>
  );
}

export default ResultsCarousel;
