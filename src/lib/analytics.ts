declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * GA4's snippet only auto-fires a pageview on the initial document load.
 * This is a client-routed SPA (React Router, no full navigation between
 * pages), so without this, GA would see exactly one pageview ever, no
 * matter how many pages a visitor actually browses. index.html loads gtag
 * with send_page_view: false specifically so this is the only place
 * pageviews get sent, on both the first load and every route change.
 */
export function trackPageview(path: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
