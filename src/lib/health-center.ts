// Website Health Center — a real, per-website audit engine.
//
// Runs a mix of (1) live Supabase content checks scoped to the active website_id
// and (2) document-level SEO / accessibility / security / config checks that apply
// to the whole app (the <head> in index.html is shared across both sites).
//
// Produces a 0–100 health score plus checks bucketed into critical / warning / pass,
// so the Founder Studio can show Health Score · Critical Issues · Warnings · Passed Checks
// and stay in sync with whichever website is currently selected.

import { supabase, isSupabaseReady } from "@/lib/supabase";
import type { Website } from "@/contexts/WebsiteContext";

export type CheckSeverity = "critical" | "warning" | "pass";
export type CheckCategory =
  | "Configuration"
  | "Content"
  | "SEO"
  | "Accessibility"
  | "Security"
  | "Performance";

export interface HealthCheck {
  id: string;
  label: string;
  category: CheckCategory;
  severity: CheckSeverity;
  detail: string;
  /** Actionable remediation shown when the check is not passing. */
  fix?: string;
  /** Optional in-app destination to resolve the issue. */
  to?: string;
}

export interface HealthReport {
  websiteId: string;
  websiteName: string;
  websiteSlug: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  generatedAt: string;
  checks: HealthCheck[];
  counts: { critical: number; warning: number; pass: number; total: number };
  metrics: {
    publishedContent: number;
    testimonials: number;
    mediaAssets: number;
    totalDownloads: number;
    totalViews: number;
  };
}

// ── helpers ───────────────────────────────────────────────────────────────────

const head = () =>
  typeof document !== "undefined" ? document.head : (null as HTMLHeadElement | null);

const metaContent = (selector: string): string | null => {
  const el = head()?.querySelector<HTMLMetaElement>(selector);
  return el?.getAttribute("content")?.trim() || null;
};

const linkExists = (rel: string): boolean =>
  !!head()?.querySelector(`link[rel="${rel}"]`);

async function safeCount(
  table: string,
  apply: (q: any) => any
): Promise<number | null> {
  if (!isSupabaseReady()) return null;
  try {
    const { count, error } = await apply(
      supabase.from(table).select("*", { count: "exact", head: true })
    );
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

function gradeFor(score: number): HealthReport["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 55) return "D";
  return "F";
}

// Weights so that critical failures move the score more than warnings.
const WEIGHT: Record<CheckSeverity, number> = { critical: 5, warning: 2, pass: 0 };

// ── main ────────────────────────────────────────────────────────────────────

export async function runHealthAudit(site: Website): Promise<HealthReport> {
  const checks: HealthCheck[] = [];
  const push = (c: HealthCheck) => checks.push(c);

  // ---- Configuration ----------------------------------------------------------
  push(
    isSupabaseReady()
      ? {
          id: "supabase",
          label: "Database connection",
          category: "Configuration",
          severity: "pass",
          detail: "Supabase is configured and reachable.",
        }
      : {
          id: "supabase",
          label: "Database connection",
          category: "Configuration",
          severity: "critical",
          detail: "Supabase environment variables are missing — content and auth are offline.",
          fix: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.",
          to: "/admin/settings",
        }
  );

  push(
    site.domain
      ? {
          id: "domain",
          label: "Custom domain",
          category: "Configuration",
          severity: "pass",
          detail: `Serving on ${site.domain}.`,
        }
      : {
          id: "domain",
          label: "Custom domain",
          category: "Configuration",
          severity: "warning",
          detail: "No custom domain is configured for this website.",
          fix: "Add a production domain so links, SEO, and sharing resolve correctly.",
          to: "/admin/settings",
        }
  );

  push(
    site.brand_color && site.accent_color
      ? {
          id: "branding",
          label: "Brand identity",
          category: "Configuration",
          severity: "pass",
          detail: "Brand and accent colors are defined.",
        }
      : {
          id: "branding",
          label: "Brand identity",
          category: "Configuration",
          severity: "warning",
          detail: "Brand colors are incomplete.",
          fix: "Define both brand and accent colors for a consistent theme.",
        }
  );

  // ---- Content (scoped to this website) --------------------------------------
  // "Published content" must count every real content table, not just
  // content_items — otherwise a site with real, live research papers or old
  // book listings still gets flagged "no published content" (found live: the
  // dashboard kept reporting this as critical after 6 research papers were
  // published, because the check only ever looked at content_items).
  const [publishedItems, publishedPapers, availableBooks, testimonials, media, downloadsRow, viewsRow, papersDownloadsRow, papersViewsRow] = await Promise.all([
    safeCount("content_items", (q) =>
      q.eq("website_id", site.id).eq("status", "published")
    ),
    safeCount("research_papers", (q) =>
      q.eq("website_id", site.id).eq("status", "published")
    ),
    safeCount("old_books", (q) => q.eq("website_id", site.id).gt("available", 0)),
    safeCount("testimonials", (q) => q.eq("website_id", site.id).eq("published", true)),
    safeCount("content_items", (q) =>
      q.eq("website_id", site.id).in("type", ["audio", "video", "pdf", "download"])
    ),
    isSupabaseReady()
      ? supabase
          .from("content_items")
          .select("download_count")
          .eq("website_id", site.id)
      : Promise.resolve({ data: null }),
    isSupabaseReady()
      ? supabase.from("content_items").select("view_count").eq("website_id", site.id)
      : Promise.resolve({ data: null }),
    isSupabaseReady()
      ? supabase.from("research_papers").select("download_count").eq("website_id", site.id)
      : Promise.resolve({ data: null }),
    isSupabaseReady()
      ? supabase.from("research_papers").select("view_count").eq("website_id", site.id)
      : Promise.resolve({ data: null }),
  ]);

  const sum = (rows: any, key: string): number =>
    Array.isArray(rows?.data)
      ? rows.data.reduce((acc: number, r: any) => acc + (r?.[key] ?? 0), 0)
      : 0;

  const totalDownloads = sum(downloadsRow, "download_count") + sum(papersDownloadsRow, "download_count");
  const totalViews = sum(viewsRow, "view_count") + sum(papersViewsRow, "view_count");

  // Only report "database offline" if every table failed — a single failed
  // query shouldn't mask real published content in the others.
  const published =
    publishedItems === null && publishedPapers === null && availableBooks === null
      ? null
      : (publishedItems ?? 0) + (publishedPapers ?? 0) + (availableBooks ?? 0);

  if (published === null) {
    push({
      id: "content",
      label: "Published content",
      category: "Content",
      severity: "warning",
      detail: "Could not read content — database offline.",
    });
  } else if (published === 0) {
    push({
      id: "content",
      label: "Published content",
      category: "Content",
      severity: "critical",
      detail: `${site.name} has no published content items.`,
      fix: "Publish at least one piece of content so the live site isn't empty.",
      to: "/admin/content-studio",
    });
  } else {
    push({
      id: "content",
      label: "Published content",
      category: "Content",
      severity: "pass",
      detail: `${published} published content item${published === 1 ? "" : "s"}.`,
    });
  }

  push(
    (testimonials ?? 0) > 0
      ? {
          id: "testimonials",
          label: "Social proof",
          category: "Content",
          severity: "pass",
          detail: `${testimonials} published testimonial${testimonials === 1 ? "" : "s"}.`,
        }
      : {
          id: "testimonials",
          label: "Social proof",
          category: "Content",
          severity: "warning",
          detail: "No published testimonials — conversion pages lack social proof.",
          fix: "Publish a few real testimonials.",
          to: "/admin/testimonials",
        }
  );

  push(
    (media ?? 0) > 0
      ? {
          id: "media",
          label: "Media assets",
          category: "Content",
          severity: "pass",
          detail: `${media} media asset${media === 1 ? "" : "s"} in the library.`,
        }
      : {
          id: "media",
          label: "Media assets",
          category: "Content",
          severity: "warning",
          detail: "No audio/video/PDF assets uploaded yet.",
          fix: "Upload media so rich content can be embedded.",
          to: "/admin/media",
        }
  );

  // ---- SEO (document <head>, shared across sites) ----------------------------
  const title = head()?.querySelector("title")?.textContent?.trim() || "";
  push(
    title.length >= 10 && title.length <= 65
      ? {
          id: "seo-title",
          label: "Page title",
          category: "SEO",
          severity: "pass",
          detail: `Title is ${title.length} characters.`,
        }
      : {
          id: "seo-title",
          label: "Page title",
          category: "SEO",
          severity: title ? "warning" : "critical",
          detail: title
            ? `Title length (${title.length}) is outside the ideal 10–65 range.`
            : "No <title> tag found.",
          fix: "Set a concise, descriptive <title> of 10–65 characters.",
        }
  );

  const desc = metaContent('meta[name="description"]');
  push(
    desc && desc.length >= 50 && desc.length <= 160
      ? {
          id: "seo-desc",
          label: "Meta description",
          category: "SEO",
          severity: "pass",
          detail: `Meta description is ${desc.length} characters.`,
        }
      : {
          id: "seo-desc",
          label: "Meta description",
          category: "SEO",
          severity: desc ? "warning" : "critical",
          detail: desc
            ? `Description length (${desc.length}) is outside the ideal 50–160 range.`
            : "No meta description found.",
          fix: "Add a 50–160 character meta description.",
        }
  );

  const ogOk = !!metaContent('meta[property="og:title"]') && !!metaContent('meta[property="og:image"]');
  push(
    ogOk
      ? {
          id: "seo-og",
          label: "Social sharing tags",
          category: "SEO",
          severity: "pass",
          detail: "Open Graph title and image are present.",
        }
      : {
          id: "seo-og",
          label: "Social sharing tags",
          category: "SEO",
          severity: "warning",
          detail: "Open Graph tags are incomplete — shared links won't render rich previews.",
          fix: "Add og:title, og:description, and og:image meta tags.",
        }
  );

  push(
    linkExists("canonical")
      ? {
          id: "seo-canonical",
          label: "Canonical URL",
          category: "SEO",
          severity: "pass",
          detail: "Canonical link is set.",
        }
      : {
          id: "seo-canonical",
          label: "Canonical URL",
          category: "SEO",
          severity: "warning",
          detail: "No canonical link — risks duplicate-content penalties.",
          fix: "Add a <link rel=\"canonical\"> tag.",
        }
  );

  push(
    linkExists("icon")
      ? {
          id: "favicon",
          label: "Favicon",
          category: "SEO",
          severity: "pass",
          detail: "Favicon is configured.",
        }
      : {
          id: "favicon",
          label: "Favicon",
          category: "SEO",
          severity: "warning",
          detail: "No favicon link found.",
          fix: "Add a favicon for browser tabs and bookmarks.",
        }
  );

  // ---- Accessibility / Responsiveness ----------------------------------------
  const viewport = metaContent('meta[name="viewport"]');
  push(
    viewport?.includes("width=device-width")
      ? {
          id: "responsive",
          label: "Responsive viewport",
          category: "Accessibility",
          severity: "pass",
          detail: "Viewport meta enables mobile responsiveness.",
        }
      : {
          id: "responsive",
          label: "Responsive viewport",
          category: "Accessibility",
          severity: "critical",
          detail: "No responsive viewport meta tag — layout will break on mobile.",
          fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">.',
        }
  );

  const lang = document?.documentElement?.getAttribute("lang");
  push(
    lang
      ? {
          id: "lang",
          label: "Document language",
          category: "Accessibility",
          severity: "pass",
          detail: `Language set to "${lang}".`,
        }
      : {
          id: "lang",
          label: "Document language",
          category: "Accessibility",
          severity: "warning",
          detail: "No lang attribute on <html> — hurts screen readers and SEO.",
          fix: 'Set <html lang="en">.',
        }
  );

  // Image alt coverage across whatever is currently rendered. alt="" is a
  // deliberate, correct WCAG pattern for decorative images (tells screen
  // readers to skip them) — only a genuinely absent attribute is a real gap.
  const imgs = typeof document !== "undefined" ? Array.from(document.images) : [];
  const missingAlt = imgs.filter((img) => img.getAttribute("alt") === null).length;
  if (imgs.length > 0) {
    push(
      missingAlt === 0
        ? {
            id: "alt",
            label: "Image alt text",
            category: "Accessibility",
            severity: "pass",
            detail: `All ${imgs.length} rendered images have alt text.`,
          }
        : {
            id: "alt",
            label: "Image alt text",
            category: "Accessibility",
            severity: "warning",
            detail: `${missingAlt} of ${imgs.length} rendered images are missing alt text.`,
            fix: "Add descriptive alt attributes to every image.",
          }
    );
  }

  // ---- Security ---------------------------------------------------------------
  const isHttps =
    typeof location !== "undefined" &&
    (location.protocol === "https:" || location.hostname === "localhost");
  push(
    isHttps
      ? {
          id: "https",
          label: "Secure connection",
          category: "Security",
          severity: "pass",
          detail: "Served over HTTPS.",
        }
      : {
          id: "https",
          label: "Secure connection",
          category: "Security",
          severity: "critical",
          detail: "Site is not served over HTTPS.",
          fix: "Force HTTPS and enable HSTS at the host/CDN.",
        }
  );

  // ---- Score ------------------------------------------------------------------
  const counts = {
    critical: checks.filter((c) => c.severity === "critical").length,
    warning: checks.filter((c) => c.severity === "warning").length,
    pass: checks.filter((c) => c.severity === "pass").length,
    total: checks.length,
  };

  const penalty = checks.reduce((acc, c) => acc + WEIGHT[c.severity], 0);
  const maxPenalty = checks.length * WEIGHT.critical || 1;
  const score = Math.max(0, Math.round(100 - (penalty / maxPenalty) * 100));

  // Surface failing checks first.
  const order: Record<CheckSeverity, number> = { critical: 0, warning: 1, pass: 2 };
  checks.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    websiteId: site.id,
    websiteName: site.name,
    websiteSlug: site.slug,
    score,
    grade: gradeFor(score),
    generatedAt: new Date().toISOString(),
    checks,
    counts,
    metrics: {
      publishedContent: published ?? 0,
      testimonials: testimonials ?? 0,
      mediaAssets: media ?? 0,
      totalDownloads,
      totalViews,
    },
  };
}

// ── Maintenance report history (persisted locally per website) ───────────────

const REPORT_KEY = (slug: string) => `founder_health_history_${slug}`;

export interface ReportSnapshot {
  generatedAt: string;
  score: number;
  grade: HealthReport["grade"];
  critical: number;
  warning: number;
  pass: number;
}

export function saveReportSnapshot(report: HealthReport): ReportSnapshot[] {
  const snapshot: ReportSnapshot = {
    generatedAt: report.generatedAt,
    score: report.score,
    grade: report.grade,
    critical: report.counts.critical,
    warning: report.counts.warning,
    pass: report.counts.pass,
  };
  const history = getReportHistory(report.websiteSlug);
  const next = [snapshot, ...history].slice(0, 20);
  try {
    localStorage.setItem(REPORT_KEY(report.websiteSlug), JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return next;
}

export function getReportHistory(slug: string): ReportSnapshot[] {
  try {
    const raw = localStorage.getItem(REPORT_KEY(slug));
    return raw ? (JSON.parse(raw) as ReportSnapshot[]) : [];
  } catch {
    return [];
  }
}
