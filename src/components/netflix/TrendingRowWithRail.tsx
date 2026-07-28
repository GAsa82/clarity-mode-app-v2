import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import type { ClaritySession } from "@/lib/clarity-content";
import { ContentRow } from "./ContentRow";

// LibraryWidgetsRail pulls in the face-verification/WebAuthn stack (its
// "Member of the Day" submission widget), which has nothing to do with
// first paint. This is the ONE eagerly-loaded page in the app (Index.tsx,
// for instant mobile first paint per its own comment) — bundling that
// weight into the critical path directly worked against that goal. Lazy
// here moves it into its own chunk instead of the ~495KB main bundle.
const LibraryWidgetsRail = lazy(() =>
  import("./LibraryWidgetsRail").then((m) => ({ default: m.LibraryWidgetsRail }))
);

type TrendingRowWithRailProps = {
  title: string;
  sessions: ClaritySession[];
  onSelect: (session: ClaritySession) => void;
};

export const TrendingRowWithRail = ({ title, sessions, onSelect }: TrendingRowWithRailProps) => {
  if (sessions.length === 0) return null;

  return (
    <motion.div
      className="mb-10 md:mb-14 px-6 md:px-12 lg:px-16"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] gap-6 lg:gap-8 items-start">
        <div className="min-w-0">
          <ContentRow
            title={title}
            sessions={sessions}
            onSelect={onSelect}
            embedded
            hideTitle={false}
          />
        </div>
        <Suspense fallback={null}>
          <LibraryWidgetsRail trendingSessions={sessions} onSelect={onSelect} />
        </Suspense>
      </div>
    </motion.div>
  );
};
