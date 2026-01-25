import { Navigation } from "lucide-react";

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card p-8 text-center space-y-4">
        {/* Animated Logo */}
        <div className="relative w-16 h-16 mx-auto">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-accent/30 loading-ring" />
          {/* Middle ring */}
          <div
            className="absolute inset-2 rounded-full border-2 border-accent/50 loading-ring"
            style={{ animationDelay: "0.2s" }}
          />
          {/* Inner icon */}
          <div className="absolute inset-4 rounded-full bg-accent/20 flex items-center justify-center">
            <Navigation className="w-6 h-6 text-accent-light animate-pulse" />
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-white">
            Finding your best route
          </h3>
          <p className="text-sm text-gray-400">
            Analyzing stops along your route...
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-accent animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoadingOverlay;
