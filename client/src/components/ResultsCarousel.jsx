import {
  Star,
  Clock,
  ExternalLink,
  Sparkles,
  MapPin,
  CheckCircle,
  XCircle,
} from "lucide-react";

function ResultsCarousel({ results, selectedIndex, onSelect }) {
  if (!results || results.length === 0) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 px-6 max-w-full overflow-x-auto pb-2">
      {results.map((result, index) => (
        <ResultCard
          key={result.placeId}
          result={result}
          isSelected={index === selectedIndex}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
}

function ResultCard({ result, isSelected, onClick }) {
  const handleOpenMaps = (e) => {
    e.stopPropagation();
    window.open(result.googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={onClick}
      className={`
        glass-card cursor-pointer flex-shrink-0
        w-72 p-5 space-y-3
        transition-all duration-300 ease-out
        ${
          isSelected
            ? "ring-2 ring-accent shadow-glow-lg scale-105"
            : "hover:scale-[1.02] opacity-80 hover:opacity-100"
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/30 text-accent-light text-sm font-bold flex items-center justify-center">
              {result.rank}
            </span>
            <h3 className="font-semibold text-white truncate">{result.name}</h3>
          </div>
        </div>
      </div>

      {/* Detour Time - Prominent */}
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-accent-light" />
        <span className="text-2xl font-bold text-accent-light">
          {result.detour.addedText}
        </span>
      </div>

      {/* Rating & Status */}
      <div className="flex items-center gap-4 text-sm">
        {result.rating && (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-white font-medium">{result.rating}</span>
            {result.userRatingCount > 0 && (
              <span className="text-gray-500">
                ({result.userRatingCount.toLocaleString()})
              </span>
            )}
          </div>
        )}

        {result.isOpen !== null && (
          <div
            className={`flex items-center gap-1 ${result.isOpen ? "text-green-400" : "text-red-400"}`}
          >
            {result.isOpen ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Open</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Closed</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Analysis */}
      {result.aiAnalysis && result.aiAnalysis.confidence !== null && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-accent/10 border border-accent/20">
          <Sparkles className="w-4 h-4 text-accent-light flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-accent-light font-medium">
                AI Confidence: {Math.round(result.aiAnalysis.confidence * 100)}%
              </span>
            </div>
            <p className="text-gray-400 line-clamp-2">
              {result.aiAnalysis.explanation}
            </p>
          </div>
        </div>
      )}

      {/* Address */}
      <div className="flex items-start gap-2 text-sm text-gray-400">
        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span className="line-clamp-2">{result.address}</span>
      </div>

      {/* Open in Google Maps Button */}
      <button
        onClick={handleOpenMaps}
        className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-light 
                   text-white font-medium text-sm
                   flex items-center justify-center gap-2
                   transition-all duration-200 shadow-glow hover:shadow-glow-lg"
      >
        <ExternalLink className="w-4 h-4" />
        Open in Google Maps
      </button>
    </div>
  );
}

export default ResultsCarousel;
