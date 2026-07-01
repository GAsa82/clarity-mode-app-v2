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
import { getWebsiteIdBySlug } from "@/lib/site-settings";
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
    video_url: typeof row.video_url === "string" ? row.video_url : null,
    audio_url: typeof row.audio_url === "string" ? row.audio_url : null,
    cover_url: typeof row.cover_url === "string" ? row.cover_url : null,
  };
}

function getByCategory(sessions: ClaritySession[], category: string) {
  return sessions.filter((s) => s.category === category && !s.featured);
}

export const NetflixBrowse = () => {
  const [selected, setSelected] = useState<ClaritySession | null>(null);
  const [dbSessions, setDbSessions] = useState<ClaritySession[]>([]);

  useEffect(() => {
    (async () => {
      const websiteId = await getWebsiteIdBySlug("clarity-mode");
      let query = supabase
        .from("content_items")
        .select("id, title, description, category, video_url, audio_url, cover_url, duration_sec, visibility")
        .eq("type", "session")
        .eq("status", "published");
      if (websiteId) query = query.eq("website_id", websiteId);
      const { data } = await query;
      if (data && data.length > 0) setDbSessions(data.map(dbToSession));
    })();
  }, []);

  const activeSessions = dbSessions.length > 0 ? dbSessions : hardcodedSessions;
  // Feature real, published content when it exists; the hardcoded session is
  // only ever shown as an illustrative placeholder when there's nothing real yet.
  const banner = dbSessions.length > 0 ? dbSessions[0] : featuredSession;

  return (
    <>
      <div className="w-full -mx-0 netflix-browse">
        <FeaturedBanner
          session={banner}
          onWatch={setSelected}
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
