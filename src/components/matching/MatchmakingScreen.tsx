import { useState } from "react";
import { motion } from "framer-motion";
import { Users, BookOpen, Network, Target, Shuffle, Lock, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchType, GenderPreference } from "@/lib/matching-service";

interface Props {
  focusRoomName: string;
  isPremium: boolean;
  onStart: (params: { matchType: MatchType; genderPreference: GenderPreference; interestTags: string[] }) => void;
  onClose: () => void;
}

const MATCH_TYPES: { type: MatchType; icon: React.ReactNode; label: string; description: string }[] = [
  { type: "study",          icon: <BookOpen className="w-5 h-5" />, label: "Study Partner",         description: "Silent co-working with a focused peer" },
  { type: "accountability", icon: <Target   className="w-5 h-5" />, label: "Accountability Buddy",  description: "Share goals and keep each other on track" },
  { type: "networking",     icon: <Network  className="w-5 h-5" />, label: "Networking",            description: "Connect with like-minded professionals" },
  { type: "random",         icon: <Shuffle  className="w-5 h-5" />, label: "Random Match",          description: "Surprise connection — anything goes" },
];

const INTEREST_TAGS = ["Coding", "Writing", "Design", "Reading", "Music", "Business", "Art", "Science", "Language", "Fitness"];

export function MatchmakingScreen({ focusRoomName, isPremium, onStart, onClose }: Props) {
  const [matchType, setMatchType]   = useState<MatchType>("study");
  const [genderPref, setGenderPref] = useState<GenderPreference>("any");
  const [tags, setTags]             = useState<string[]>([]);

  const toggleTag = (tag: string) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag].slice(0, 5));

  const handleStart = () => onStart({ matchType, genderPreference: genderPref, interestTags: tags });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-base">Find a 1-on-1 Partner</h3>
        </div>
        <p className="text-xs text-muted-foreground">in {focusRoomName}</p>
      </div>

      {/* Match type */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Session type</p>
        <div className="grid grid-cols-2 gap-2">
          {MATCH_TYPES.map(({ type, icon, label, description }) => (
            <button
              key={type}
              onClick={() => setMatchType(type)}
              className={`p-3 rounded-xl border text-left transition-all ${
                matchType === type
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card-elevated hover:border-primary/40"
              }`}
            >
              <div className={`mb-1.5 ${matchType === type ? "text-primary" : "text-muted-foreground"}`}>{icon}</div>
              <p className="text-xs font-medium">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Gender preference — premium feature */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Partner preference</p>
          {!isPremium && (
            <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Lock className="w-2.5 h-2.5" />Premium
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {(["any", "male", "female"] as GenderPreference[]).map(pref => (
            <button
              key={pref}
              disabled={!isPremium && pref !== "any"}
              onClick={() => isPremium && setGenderPref(pref)}
              className={`flex-1 py-1.5 rounded-lg text-xs capitalize transition-all border ${
                genderPref === pref
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              } ${!isPremium && pref !== "any" ? "opacity-40 cursor-not-allowed" : "hover:border-primary/40"}`}
            >
              {pref}
            </button>
          ))}
        </div>
      </div>

      {/* Interest tags — premium feature */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Interest tags</p>
          {!isPremium && (
            <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <Lock className="w-2.5 h-2.5" />Premium
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INTEREST_TAGS.map(tag => (
            <button
              key={tag}
              disabled={!isPremium}
              onClick={() => isPremium && toggleTag(tag)}
              className={`px-2.5 py-1 rounded-full text-[11px] transition-all border ${
                tags.includes(tag)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30"
              } ${!isPremium ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {tag}
            </button>
          ))}
        </div>
        {isPremium && <p className="text-[10px] text-muted-foreground mt-2">Select up to 5 • matched with similar interests</p>}
      </div>

      {/* Free plan limits */}
      {!isPremium && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-amber-400">Free Plan — 3 matches/day · voice only</p>
            <p className="text-[10px] text-amber-400/70 mt-0.5">Premium unlocks video calls, filters, and unlimited matches.</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">Cancel</Button>
        <Button variant="hero" size="sm" onClick={handleStart} className="flex-1 gap-1.5">
          Find Partner
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
