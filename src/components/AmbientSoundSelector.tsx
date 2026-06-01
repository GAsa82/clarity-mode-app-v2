import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Music } from "lucide-react";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";

const trackNames: Record<string, string> = {
  none: "Silence",
  lofi: "Lo-Fi Beats",
  rain: "Rainy Day",
  wind: "Wind & Leaves",
  fire: "Crackling Fire",
  waves: "Ocean Waves",
  cafe: "Coffee Shop",
  space: "Deep Space",
  brown: "Brown Noise",
};

const trackIcons: Record<string, string> = {
  none: "🔇",
  lofi: "🎧",
  rain: "🌧️",
  wind: "🍃",
  fire: "🔥",
  waves: "�",
  cafe: "☕",
  space: "🌌",
  brown: "💨",
};

const trackColors: Record<string, string> = {
  none: "bg-secondary",
  lofi: "bg-blue-500/20",
  rain: "bg-sky-500/20",
  wind: "bg-emerald-500/20",
  fire: "bg-orange-500/20",
  waves: "bg-cyan-500/20",
  cafe: "bg-amber-500/20",
  space: "bg-purple-500/20",
  brown: "bg-stone-500/20",
};

const trackOrder = ["none", "lofi", "rain", "wind", "fire", "waves", "cafe", "space", "brown"];

export const AmbientSoundSelector = () => {
  const [expanded, setExpanded] = useState(false);
  const { activeSound, isPlaying, volume, muted, playSound, setVolume, toggleMute } = useAmbientAudio();

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-card-elevated border border-border hover:border-primary/30 transition-all"
      >
        {muted || activeSound === "none" ? (
          <VolumeX className="w-3 h-3 text-muted-foreground" />
        ) : (
          <>
            {isPlaying && (
              <span className="flex gap-[1.5px] items-end h-3">
                <motion.span
                  className="w-[2px] bg-primary rounded-full"
                  animate={{ height: ["4px", "10px", "4px"] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
                <motion.span
                  className="w-[2px] bg-primary rounded-full"
                  animate={{ height: ["8px", "3px", "8px"] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <motion.span
                  className="w-[2px] bg-primary rounded-full"
                  animate={{ height: ["3px", "9px", "3px"] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              </span>
            )}
          </>
        )}
        <span className="text-[9px] text-muted-foreground">
          {activeSound === "none" ? "Ambient" : trackNames[activeSound]}
        </span>
        {activeSound !== "none" && <span className="text-xs">{trackIcons[activeSound]}</span>}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full right-0 mt-2 z-30 w-64 rounded-2xl bg-card-elevated border border-border shadow-elegant p-3"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/60">
              <Music className="w-3 h-3 text-primary" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">Ambient Sounds</p>
              {activeSound !== "none" && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                  className="ml-auto p-1 rounded-full hover:bg-secondary transition-colors"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Sound grid */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {trackOrder.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => playSound(id as any)}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all ${
                    activeSound === id
                      ? `${trackColors[id]} ring-1 ring-primary/40`
                      : "hover:bg-secondary"
                  }`}
                >
                  <span className="text-lg">{trackIcons[id]}</span>
                  <span className="text-[7px] text-muted-foreground text-center leading-tight">
                    {trackNames[id]}
                  </span>
                </button>
              ))}
            </div>

            {/* Visualizer and Volume */}
            {activeSound !== "none" && (
              <div className="pt-2 border-t border-border/60 space-y-2">
                {/* Animated visualizer */}
                <div className="flex items-center gap-[2px] h-8 justify-center">
                  {isPlaying && !muted ? (
                    Array.from({ length: 20 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-[3px] bg-primary/40 rounded-full"
                        animate={{
                          height: [
                            `${Math.random() * 60 + 20}%`,
                            `${Math.random() * 60 + 20}%`,
                            `${Math.random() * 60 + 20}%`,
                          ],
                        }}
                        transition={{
                          duration: 0.5 + Math.random() * 0.5,
                          repeat: Infinity,
                          delay: Math.random() * 0.3,
                        }}
                      />
                    ))
                  ) : (
                    <span className="text-[8px] text-muted-foreground">
                      {muted ? "Muted" : "Loading..."}
                    </span>
                  )}
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-2">
                  <VolumeX className="w-3 h-3 text-muted-foreground shrink-0" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={muted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1 appearance-none bg-secondary rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-glow"
                  />
                  <Volume2 className="w-3 h-3 text-primary shrink-0" />
                </div>

                {/* Status */}
                <p className="text-[8px] text-muted-foreground/50 text-center">
                  {trackNames[activeSound]} • {Math.round((muted ? 0 : volume) * 100)}%
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};