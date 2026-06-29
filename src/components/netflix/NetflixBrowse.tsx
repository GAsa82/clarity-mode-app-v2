import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  contentSections,
  featuredSession,
  getSessionsByCategory,
  type ClaritySession,
  sessions as hardcodedSessions,
} from "@/lib/clarity-content";
import { supabase } from "@/lib/supabase";
import { FeaturedBanner } from "./FeaturedBanner";
import { ContentRow } from "./ContentRow";
import { ContentPreviewModal } from "./ContentPreviewModal";
import { TrendingRowWithRail } from "./TrendingRowWithRail";

const ACCENT_MAP: Record<string, string> = {
  "Trending": "from-primary/30 to-slate-950",
  "Mental Clarity": "from-blue-800/40 to-slate-950",
  "Confidence": "from-indigo-500/35 to-slate-900",
  "Dopamine Detox": "from-violet-600/35 to-slate-950",
  "Emotional Intelligence": "from-teal-500/25 to-slate-900",
  "Discipline": "from-slate-500/30 to-slate-950",
  "Focus Protocols": "from-blue-500/30 to-slate-950",
  "Sleep Reset": "from-indigo-800/40 to-slate-950",
};

function dbToSession(row: Record<string, unknown>): ClaritySession {
  const durationSec = typeof row.duration_sec === "number" ? row.duration_sec : null;
  const type: ClaritySession["type"] = row.video_url ? "video" : row.audio_url ? "audio" : "article";
  const category = typeof row.category === "string" ? row.category : "Mental Clarity";
  return {
    id: String(row.id),
    title: String(row.title),
    subtitle: typeof row.description === "string" ? row.description : "",
    duration: durationSec ? `${Math.round(durationSec / 60)} min` : "",
    category,
    type,
    premium: row.visibility === "premium",
    accent: ACCENT_MAP[category] ?? "from-blue-900/80 to-slate-950",
  };
}

function getByCategory(sessions: ClaritySession[], category: string) {
  return sessions.filter((s) => s.category === category && !s.featured);
}

export const NetflixBrowse = () => {
  const [selected, setSelected] = useState<ClaritySession | null>(null);
  const [dbSessions, setDbSessions] = useState<ClaritySession[]>([]);

  useEffect(() => {
    supabase
      .from("content_items")
      .select("id, title, description, category, video_url, audio_url, duration_sec, visibility")
      .eq("type", "session")
      .eq("status", "published")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDbSessions(data.map(dbToSession));
        }
      });
  }, []);

  const activeSessions = dbSessions.length > 0 ? dbSessions : hardcodedSessions;

  const handleWatch = (session: ClaritySession) => {
    if (session.premium) {
      window.location.href = "/pricing";
    }
  };

  return (
    <>
      <div className="w-full -mx-0 netflix-browse">
        <FeaturedBanner
          session={featuredSession}
          onWatch={handleWatch}
          onMoreInfo={setSelected}
        />

        <TrendingRowWithRail
          title={contentSections[0].title}
          sessions={getByCategory(activeSessions, contentSections[0].category)}
          onSelect={setSelected}
        />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {contentSections.slice(1).map((section, i) => (
            <ContentRow
              key={section.category}
              title={section.title}
              sessions={getByCategory(activeSessions, section.category)}
              onSelect={setSelected}
              index={i + 1}
            />
          ))}
        </motion.div>
      </div>

      <ContentPreviewModal session={selected} onClose={() => setSelected(null)} />
    </>
  );
};
