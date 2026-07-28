// Runs before every build. Without this, search engines have no way to
// discover individual research papers or library items — there was no
// sitemap.xml at all, and until this build those pages didn't even have
// their own URLs (see /research/:id, /library/:id).
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SITE_ORIGIN = "https://clarity-mode-app-v2-gq26.vercel.app";

// Same anon-safe values already shipped in the client bundle — not secrets.
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://vajenjgxaznftlvribzl.supabase.co";
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhamVuamd4YXpuZnRsdnJpYnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODQxNTQsImV4cCI6MjA5NjE2MDE1NH0.k82-y_2ZZPOjS4tJ-2fbXycG4g-MkzHjTuRYoTf_8xg";

const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/research", priority: "0.8", changefreq: "weekly" },
  { path: "/library", priority: "0.8", changefreq: "weekly" },
  { path: "/pricing", priority: "0.7", changefreq: "monthly" },
  { path: "/about", priority: "0.5", changefreq: "monthly" },
  { path: "/contact", priority: "0.4", changefreq: "monthly" },
  { path: "/coaching", priority: "0.6", changefreq: "monthly" },
  { path: "/privacy", priority: "0.2", changefreq: "yearly" },
  { path: "/terms", priority: "0.2", changefreq: "yearly" },
  { path: "/refunds", priority: "0.2", changefreq: "yearly" },
];

const LIBRARY_TYPES = ["article", "insight", "protocol", "framework", "template", "pdf", "guide", "workbook", "download"];

function urlEntry(loc, lastmod, changefreq, priority) {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const entries = STATIC_ROUTES.map((r) =>
    urlEntry(`${SITE_ORIGIN}${r.path}`, null, r.changefreq, r.priority)
  );

  const { data: papers, error: papersErr } = await supabase
    .from("research_papers")
    .select("id, updated_at")
    .eq("status", "published");
  if (papersErr) {
    console.warn("[sitemap] research_papers query failed, skipping:", papersErr.message);
  } else {
    for (const p of papers ?? []) {
      entries.push(urlEntry(`${SITE_ORIGIN}/research/${p.id}`, p.updated_at, "monthly", "0.6"));
    }
  }

  const { data: items, error: itemsErr } = await supabase
    .from("content_items")
    .select("id, updated_at")
    .in("type", LIBRARY_TYPES)
    .eq("status", "published");
  if (itemsErr) {
    console.warn("[sitemap] content_items query failed, skipping:", itemsErr.message);
  } else {
    for (const i of items ?? []) {
      entries.push(urlEntry(`${SITE_ORIGIN}/library/${i.id}`, i.updated_at, "monthly", "0.6"));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

  const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
  writeFileSync(path.join(publicDir, "sitemap.xml"), xml);
  console.log(`[sitemap] wrote ${entries.length} URLs to public/sitemap.xml`);
}

main().catch((err) => {
  // A failed sitemap fetch shouldn't block a deploy — log and move on.
  console.warn("[sitemap] generation failed, continuing without it:", err.message);
});
