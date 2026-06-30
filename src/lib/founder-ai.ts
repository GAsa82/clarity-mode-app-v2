// AI Command Center — a natural-language command router for the Founder Studio.
//
// Parses a founder's plain-English instruction and resolves it to a concrete,
// actionable response: navigate somewhere in the control center, run the live
// health audit, compile a report, etc. It works fully offline (deterministic
// intent matching) and stays in sync with whichever website is active.

import type { Website } from "@/contexts/WebsiteContext";

export type CommandAction =
  | { kind: "navigate"; to: string; label: string }
  | { kind: "audit"; label: string }
  | { kind: "report"; label: string }
  | { kind: "switch"; label: string };

export interface CommandResult {
  intent: string;
  title: string;
  message: string;
  actions: CommandAction[];
}

interface Intent {
  id: string;
  keywords: string[];
  resolve: (input: string, site: Website | null) => CommandResult;
}

const siteName = (s: Website | null) => s?.name ?? "the active website";

const INTENTS: Intent[] = [
  {
    id: "audit",
    keywords: ["audit", "health", "scan", "check site", "check website", "diagnose", "status"],
    resolve: (_i, site) => ({
      intent: "audit",
      title: "Running full website audit",
      message: `Auditing ${siteName(site)} — configuration, content, SEO, accessibility, and security. Results will populate the Website Health Center below.`,
      actions: [{ kind: "audit", label: "Run audit now" }],
    }),
  },
  {
    id: "bugs",
    keywords: ["bug", "broken", "error", "issue", "find bugs", "debug", "not working"],
    resolve: (_i, site) => ({
      intent: "bugs",
      title: "Bug & issue sweep",
      message: `Scanning ${siteName(site)} for failing checks. Anything critical surfaces at the top of the Health Center with a one-line fix. Re-run the audit to refresh.`,
      actions: [
        { kind: "audit", label: "Scan for issues" },
        { kind: "navigate", to: "/admin/audit-logs", label: "Open audit logs" },
      ],
    }),
  },
  {
    id: "responsive",
    keywords: ["responsive", "mobile", "responsiveness", "layout", "tablet", "breakpoint"],
    resolve: (_i, site) => ({
      intent: "responsive",
      title: "Responsiveness check",
      message: `Verifying the responsive viewport and layout signals for ${siteName(site)}. The audit flags a missing viewport meta as critical. Use Site Content to adjust hero/section layout.`,
      actions: [
        { kind: "audit", label: "Check responsiveness" },
        { kind: "navigate", to: "/admin/site-content", label: "Edit layout" },
      ],
    }),
  },
  {
    id: "seo",
    keywords: ["seo", "search", "ranking", "optimize seo", "meta", "google", "keywords"],
    resolve: (_i, site) => ({
      intent: "seo",
      title: "SEO optimization",
      message: `Reviewing title, meta description, Open Graph, and canonical tags for ${siteName(site)}. The Health Center lists each SEO gap with the recommended length and fix.`,
      actions: [
        { kind: "audit", label: "Audit SEO" },
        { kind: "navigate", to: "/admin/site-content", label: "Edit metadata" },
      ],
    }),
  },
  {
    id: "content",
    keywords: ["content", "create content", "write", "publish", "blog", "article", "post", "upload"],
    resolve: (_i, site) => ({
      intent: "content",
      title: "Create content",
      message: `Opening the Content Studio for ${siteName(site)} — publish books, research papers, protocols, blogs, sessions, and media. Everything you add is scoped to the active website.`,
      actions: [
        { kind: "navigate", to: "/admin/content-studio", label: "Open Content Studio" },
        { kind: "navigate", to: "/admin/media", label: "Upload media" },
      ],
    }),
  },
  {
    id: "reports",
    keywords: ["report", "reports", "generate report", "summary", "export", "maintenance"],
    resolve: (_i, site) => ({
      intent: "reports",
      title: "Generating report",
      message: `Compiling a maintenance report for ${siteName(site)} from the latest audit — score, issues, warnings, and passing checks. It's saved to Maintenance Reports and can be downloaded.`,
      actions: [{ kind: "report", label: "Generate report" }],
    }),
  },
  {
    id: "analytics",
    keywords: ["analytics", "revenue", "traffic", "downloads", "conversion", "sales", "metrics", "money"],
    resolve: (_i, site) => ({
      intent: "analytics",
      title: "Analytics overview",
      message: `Pulling live revenue, traffic, downloads, and conversions for ${siteName(site)}. The Analytics panel shows the headline numbers; the full breakdown is in the Analytics workspace.`,
      actions: [
        { kind: "navigate", to: "/admin/analytics", label: "Open Analytics" },
        { kind: "navigate", to: "/admin/orders", label: "View orders" },
      ],
    }),
  },
  {
    id: "switch",
    keywords: ["switch", "breakthrough", "clarity", "change website", "other site", "toggle site"],
    resolve: (input) => {
      const wantsBreak = /break/i.test(input);
      const wantsClarity = /clarity/i.test(input);
      return {
        intent: "switch",
        title: "Switch website",
        message: wantsBreak
          ? "Switching to Breakthrough Protocol. All modules will re-scope to that website."
          : wantsClarity
          ? "Switching to Clarity Mode. All modules will re-scope to that website."
          : "Use the website switcher at the top to move between Clarity Mode and Breakthrough Protocol.",
        actions: [{ kind: "switch", label: "Use website switcher" }],
      };
    },
  },
  {
    id: "knowledge",
    keywords: ["knowledge", "ai knowledge", "train", "documents", "embeddings", "vault"],
    resolve: (_i, site) => ({
      intent: "knowledge",
      title: "AI Knowledge Base",
      message: `Opening the AI Knowledge Base for ${siteName(site)} — manage indexed documents and training material that power AI features.`,
      actions: [{ kind: "navigate", to: "/admin/knowledge", label: "Open Knowledge Base" }],
    }),
  },
  {
    id: "settings",
    keywords: ["settings", "configure", "system", "config", "domain", "environment"],
    resolve: () => ({
      intent: "settings",
      title: "System Settings",
      message: "Opening system settings — domains, integrations, and environment configuration.",
      actions: [{ kind: "navigate", to: "/admin/settings", label: "Open Settings" }],
    }),
  },
];

const FALLBACK: CommandResult = {
  intent: "unknown",
  title: "Command Center",
  message:
    "I can audit the website, find bugs, fix responsiveness, optimize SEO, create content, pull analytics, or generate reports. Try one of the suggestions, or rephrase your request.",
  actions: [
    { kind: "audit", label: "Run a full audit" },
    { kind: "navigate", to: "/admin/content-studio", label: "Open Content Studio" },
  ],
};

/** Deterministic, offline intent resolution. */
export function routeCommand(input: string, site: Website | null): CommandResult {
  const text = input.toLowerCase().trim();
  if (!text) return FALLBACK;

  let best: { intent: Intent; score: number } | null = null;
  for (const intent of INTENTS) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (text.includes(kw)) score += kw.includes(" ") ? 3 : 2;
    }
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }

  return best ? best.intent.resolve(input, site) : FALLBACK;
}

export const COMMAND_SUGGESTIONS = [
  "Audit website",
  "Find bugs",
  "Fix responsiveness",
  "Optimize SEO",
  "Create content",
  "Generate reports",
] as const;
