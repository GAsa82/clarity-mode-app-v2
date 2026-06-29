import { useState } from "react";
import { motion } from "framer-motion";
import {
  contentSections,
  featuredSession,
  getSessionsByCategory,
  type ClaritySession,
} from "@/lib/clarity-content";
import { FeaturedBanner } from "./FeaturedBanner";
import { ContentRow } from "./ContentRow";
import { ContentPreviewModal } from "./ContentPreviewModal";
import { TrendingRowWithRail } from "./TrendingRowWithRail";

export const NetflixBrowse = () => {
  const [selected, setSelected] = useState<ClaritySession | null>(null);

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
          sessions={getSessionsByCategory(contentSections[0].category)}
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
              sessions={getSessionsByCategory(section.category)}
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
