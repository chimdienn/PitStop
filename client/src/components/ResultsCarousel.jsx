import { useState, useRef, useEffect } from "react";
import {
  Star,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle,
  XCircle,
  Timer,
  ChevronRight,
  ChevronLeft,
  Search,
  Navigation,
  ChevronDown,
  X,
} from "lucide-react";

function ResultsCarousel({
  results,
  selectedIndex,
  onSelect,
  onShowMore,
  onShowLess,
  displayCount,
  totalResults,
  isMobile = false,
  isTablet = false,
}) {
  const [hoveredResult, setHoveredResult] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const scrollContainerRef = useRef(null);
  const [prevResultsCount, setPrevResultsCount] = useState(
    results?.length || 0,
  );

  // Auto-scroll when more results are added
  useEffect(() => {
    if (
      results &&
      results.length > prevResultsCount &&
      scrollContainerRef.current
    ) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        const scrollAmount = container.scrollWidth - container.clientWidth;
        container.scrollTo({
          left: scrollAmount,
          behavior: "smooth",
        });
      }, 50);
    }
    setPrevResultsCount(results?.length || 0);
  }, [results?.length, prevResultsCount]);

  if (!results || results.length === 0) return null;

  const handleMouseEnter = (result, event) => {
    if (isMobile) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setHoveredResult(result);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    setHoveredResult(null);
  };

  const handleCardClick = (index) => {
    onSelect(index);
    if (isMobile) {
      setShowMobileDetail(true);
    }
  };

  const selectedResult = results[selectedIndex];

  return (
    <>
      {/* Mobile Detail Panel */}
      {isMobile && showMobileDetail && selectedResult && (
        <MobileDetailPanel
          result={selectedResult}
          onClose={() => setShowMobileDetail(false)}
        />
      )}

      {/* Main Carousel */}
      <div
        className={`absolute ${isMobile ? "bottom-2 left-0 right-0 px-2" : "bottom-6 left-0 right-0 px-4"}`}
      >
        {/* Desktop Hover Tooltip - Only render on non-mobile */}
        {!isMobile && hoveredResult && (
          <HoverTooltip result={hoveredResult} position={tooltipPosition} />
        )}

        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Less button */}
          {onShowLess && (
            <button
              onClick={onShowLess}
              className={`flex-shrink-0 flex flex-col items-center justify-center gap-0.5 
                         ${isMobile ? "px-2 py-2" : "px-3 py-3"} 
                         rounded-xl bg-dark-700/90 border border-glass-border 
                         hover:bg-accent/20 hover:border-accent/50 transition-all duration-200`}
              title="Show less"
            >
              <ChevronLeft
                className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} text-accent-light`}
              />
              <span
                className={`${isMobile ? "text-[10px]" : "text-xs"} text-gray-400`}
              >
                Less
              </span>
            </button>
          )}

          {/* Scrollable cards container */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto pb-2 scrollbar-hide"
          >
            <div className="flex gap-2 md:gap-3 w-max">
              {results.map((result, index) => (
                <ResultCard
                  key={result.placeId}
                  result={result}
                  index={index}
                  isSelected={index === selectedIndex}
                  onClick={() => handleCardClick(index)}
                  onMouseEnter={(e) => handleMouseEnter(result, e)}
                  onMouseLeave={handleMouseLeave}
                  isMobile={isMobile}
                  isTablet={isTablet}
                />
              ))}
            </div>
          </div>

          {/* More button */}
          {onShowMore && (
            <button
              onClick={onShowMore}
              className={`flex-shrink-0 flex flex-col items-center justify-center gap-0.5 
                         ${isMobile ? "px-2 py-2" : "px-3 py-3"} 
                         rounded-xl bg-dark-700/90 border border-glass-border 
                         hover:bg-accent/20 hover:border-accent/50 transition-all duration-200`}
              title="Show more"
            >
              <ChevronRight
                className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} text-accent-light`}
              />
              <span
                className={`${isMobile ? "text-[10px]" : "text-xs"} text-gray-400`}
              >
                More
              </span>
            </button>
          )}
        </div>

        {/* Results count indicator */}
        <div className="text-center mt-1.5 md:mt-2">
          <span
            className={`${isMobile ? "text-[10px]" : "text-xs"} text-gray-500`}
          >
            {results.length} of {totalResults} results
            {isMobile && " • Tap for details"}
          </span>
        </div>
      </div>
    </>
  );
}

// ============ MOBILE DETAIL PANEL ============
function MobileDetailPanel({ result, onClose }) {
  const detourMinutes = Math.max(0, result.detour.minutes);
  const detourDisplay = `+${detourMinutes} min`;
  const totalTravelMinutes = Math.round(
    result.detourRoute.durationSeconds / 60,
  );
  const hours = Math.floor(totalTravelMinutes / 60);
  const minutes = totalTravelMinutes % 60;
  const totalTimeDisplay =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;

  const handleOpenMaps = () => {
    window.open(result.googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenSearch = () => {
    const searchQuery = encodeURIComponent(`${result.name} ${result.address}`);
    window.open(
      `https://www.google.com/search?q=${searchQuery}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  // Prevent scroll on body when panel is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Dark backdrop - fully opaque */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Panel */}
      <div
        className="absolute inset-x-0 bottom-0 bg-dark-900 border-t border-glass-border rounded-t-2xl 
                   max-h-[75vh] flex flex-col slide-up-bottom"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      >
        {/* Handle bar */}
        <div className="flex-shrink-0 pt-3 pb-2 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-gray-600" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-dark-700 hover:bg-dark-600 text-gray-400"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Photo */}
          {result.photoUrl && (
            <div className="h-36 w-full overflow-hidden rounded-xl mb-4">
              <img
                src={result.photoUrl}
                alt={result.name}
                className="w-full h-full object-cover"
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>
          )}

          {/* Name */}
          <h3 className="text-xl font-bold text-white mb-2">{result.name}</h3>

          {/* Rating Row */}
          <div className="flex items-center gap-4 mb-3">
            {result.rating && (
              <div className="flex items-center gap-1.5">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-white font-semibold text-lg">
                  {result.rating}
                </span>
                <span className="text-gray-500 text-sm">
                  ({result.userRatingCount?.toLocaleString() || 0})
                </span>
              </div>
            )}
            {result.isOpen !== null && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium
                             ${result.isOpen ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
              >
                {result.isOpen ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                {result.isOpen ? "Open" : "Closed"}
              </div>
            )}
          </div>

          {/* Address */}
          <div className="flex items-start gap-2.5 text-gray-400 mb-4">
            <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5 text-accent-light" />
            <span className="text-sm leading-relaxed">{result.address}</span>
          </div>

          {/* Time Info Card */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800 border border-glass-border mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent-light" />
              </div>
              <div>
                <span className="text-2xl font-bold text-accent-light">
                  {detourDisplay}
                </span>
                <p className="text-xs text-gray-500">detour time</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Timer className="w-4 h-4" />
                <span className="text-sm font-medium">{totalTimeDisplay}</span>
              </div>
              <p className="text-xs text-gray-500">total trip</p>
            </div>
          </div>

          {/* AI Analysis */}
          {result.aiAnalysis && result.aiAnalysis.confidence !== null && (
            <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-accent-light" />
                <span className="text-sm text-accent-light font-semibold">
                  AI Overview
                </span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {result.aiAnalysis.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Fixed Action Buttons at bottom */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2 border-t border-glass-border bg-dark-900">
          <div className="flex gap-3">
            <button
              onClick={handleOpenMaps}
              className="flex-1 py-3.5 px-4 rounded-xl bg-accent hover:bg-accent-light 
                         text-white font-semibold text-base
                         flex items-center justify-center gap-2
                         transition-all duration-200 active:scale-95"
            >
              <Navigation className="w-5 h-5" />
              Open in Maps
            </button>
            <button
              onClick={handleOpenSearch}
              className="flex-1 py-3.5 px-4 rounded-xl bg-dark-700 hover:bg-dark-600
                         text-white font-semibold text-base
                         flex items-center justify-center gap-2 border border-glass-border
                         transition-all duration-200 active:scale-95"
            >
              <Search className="w-5 h-5" />
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ DESKTOP HOVER TOOLTIP ============
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

  // Simple gap - translateY(-100%) handles positioning the tooltip above this point
  const GAP = 16;

  // Ensure horizontal position stays within viewport
  const safeLeft = Math.min(Math.max(150, position.x), window.innerWidth - 150);

  return (
    <div
      className="fixed z-[100] w-72 bg-[#111118] border border-glass-border rounded-xl shadow-2xl animate-fadeIn pointer-events-none"
      style={{
        left: safeLeft,
        top: position.y - GAP,
        transform: "translate(-50%, -100%)",
      }}
    >
      {/* Photo */}
      {result.photoUrl && (
        <div className="h-24 w-full overflow-hidden rounded-t-xl">
          <img
            src={result.photoUrl}
            alt={result.name}
            className="w-full h-full object-cover"
            onError={(e) => (e.target.style.display = "none")}
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Full Name */}
        <h4 className="font-semibold text-white text-sm leading-tight">
          {result.name}
        </h4>

        {/* Full Address */}
        <div className="flex items-start gap-2 text-xs text-gray-400">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-accent-light" />
          <span className="line-clamp-2">{result.address}</span>
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
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent-light flex-shrink-0" />
              <span className="text-xs text-accent-light font-medium">
                AI Overview:
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mt-1 line-clamp-2">
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
            <span>Total: {totalTimeDisplay}</span>
          </div>
        </div>
      </div>

      {/* Arrow pointing down to the card */}
      <div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 
                   bg-[#111118] border-r border-b border-glass-border"
      />
    </div>
  );
}

// ============ RESULT CARD ============
function ResultCard({
  result,
  index,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isMobile = false,
  isTablet = false,
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

  // Card width based on device
  const cardWidthClass = isMobile
    ? "w-44 min-w-44"
    : isTablet
      ? "w-48 min-w-48"
      : "w-56";

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        glass-card cursor-pointer flex-shrink-0
        ${cardWidthClass} ${isMobile ? "p-2.5" : "p-3"} ${isMobile ? "space-y-1.5" : "space-y-2"}
        transition-all duration-300 ease-out
        ${
          isSelected
            ? "ring-2 ring-accent shadow-glow-lg scale-105"
            : "hover:scale-[1.02] opacity-80 hover:opacity-100"
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <span
          className={`flex-shrink-0 ${isMobile ? "w-5 h-5 text-xs" : "w-5 h-5 text-xs"} rounded-full bg-accent/30 text-accent-light font-bold flex items-center justify-center`}
        >
          {index + 1}
        </span>
        <h3
          className={`font-semibold text-white truncate ${isMobile ? "text-xs" : "text-sm"}`}
        >
          {result.name}
        </h3>
      </div>

      {/* Time Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Clock
            className={`${isMobile ? "w-3 h-3" : "w-3.5 h-3.5"} text-accent-light`}
          />
          <span
            className={`${isMobile ? "text-sm" : "text-base"} font-bold text-accent-light`}
          >
            {detourDisplay}
          </span>
        </div>
        <div
          className={`flex items-center gap-1 text-gray-400 ${isMobile ? "text-[10px]" : "text-xs"}`}
        >
          <Timer className={`${isMobile ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
          <span>{totalTimeDisplay}</span>
        </div>
      </div>

      {/* Rating & Status */}
      <div
        className={`flex items-center gap-1.5 md:gap-2 ${isMobile ? "text-[11px]" : "text-xs"}`}
      >
        {result.rating && (
          <div className="flex items-center gap-0.5 md:gap-1">
            <Star
              className={`${isMobile ? "w-3 h-3" : "w-3 h-3"} text-yellow-500 fill-yellow-500`}
            />
            <span className="text-white font-medium">{result.rating}</span>
          </div>
        )}

        {result.isOpen !== null && (
          <div
            className={`flex items-center gap-0.5 md:gap-1 ${result.isOpen ? "text-green-400" : "text-red-400"}`}
          >
            {result.isOpen ? (
              <>
                <CheckCircle
                  className={`${isMobile ? "w-3 h-3" : "w-3 h-3"}`}
                />
                <span>Open</span>
              </>
            ) : (
              <>
                <XCircle className={`${isMobile ? "w-3 h-3" : "w-3 h-3"}`} />
                <span>Closed</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Address - truncated on mobile */}
      <div
        className={`${isMobile ? "text-[10px]" : "text-xs"} text-gray-400 truncate`}
      >
        {result.address}
      </div>

      {/* Action Buttons */}
      <div className={`flex gap-1.5 md:gap-2 ${isMobile ? "pt-0.5" : ""}`}>
        <button
          onClick={handleOpenMaps}
          className={`flex-1 ${isMobile ? "py-1.5 px-2 text-[11px]" : "py-1.5 px-2 text-xs"} rounded-lg bg-accent hover:bg-accent-light 
                     text-white font-medium
                     flex items-center justify-center gap-1
                     transition-all duration-200`}
          title="Open route in Google Maps"
        >
          <Navigation className={`${isMobile ? "w-3 h-3" : "w-3 h-3"}`} />
          Route
        </button>
        <button
          onClick={handleOpenSearch}
          className={`flex-1 ${isMobile ? "py-1.5 px-2 text-[11px]" : "py-1.5 px-2 text-xs"} rounded-lg bg-dark-600 hover:bg-dark-500
                     text-gray-300 hover:text-white font-medium
                     flex items-center justify-center gap-1 border border-glass-border
                     transition-all duration-200`}
          title="Search on Google"
        >
          <Search className={`${isMobile ? "w-3 h-3" : "w-3 h-3"}`} />
          Search
        </button>
      </div>
    </div>
  );
}

export default ResultsCarousel;
