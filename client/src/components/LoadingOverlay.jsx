import { Navigation } from "lucide-react";

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card p-6 md:p-8 text-center space-y-3 md:space-y-4 max-w-xs md:max-w-sm">
        {/* Animated Logo */}
        <div className="relative w-12 h-12 md:w-16 md:h-16 mx-auto">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-accent/30 loading-ring" />
          {/* Middle ring */}
          <div
            className="absolute inset-1.5 md:inset-2 rounded-full border-2 border-accent/50 loading-ring"
            style={{ animationDelay: "0.2s" }}
          />
          {/* Inner icon */}
          <div className="absolute inset-3 md:inset-4 rounded-full bg-accent/20 flex items-center justify-center">
            <Navigation className="w-4 h-4 md:w-6 md:h-6 text-accent-light animate-pulse" />
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-1 md:space-y-2">
          <h3 className="text-base md:text-lg font-semibold text-white">
            Finding your best route
          </h3>
          <p className="text-xs md:text-sm text-gray-400">
            Analyzing stops along your route...
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 md:gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-accent animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoadingOverlay;
