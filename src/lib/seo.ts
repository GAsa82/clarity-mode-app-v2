import { useEffect } from "react";

/**
 * Every route currently ships the exact same <title>, meta description, and
 * canonical URL baked into index.html — including a canonical tag that
 * points at the homepage from every single page. That tells search engines
 * every other URL is a duplicate of "/", which actively suppresses them
 * from ranking independently. This hook lets any route set its own values.
 */

const SITE_ORIGIN = "https://clarity-mode-app-v2-gq26.vercel.app";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

type SEOInput = {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown>;
};

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function useSEO({ title, description, path, image, type = "website", jsonLd }: SEOInput) {
  useEffect(() => {
    const url = `${SITE_ORIGIN}${path ?? window.location.pathname}`;
    document.title = title;

    if (description) setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    if (description) setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image ?? DEFAULT_OG_IMAGE);
    setMeta("name", "twitter:title", title);
    if (description) setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image ?? DEFAULT_OG_IMAGE);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    let ld = document.getElementById("seo-jsonld") as HTMLScriptElement | null;
    if (jsonLd) {
      if (!ld) {
        ld = document.createElement("script");
        ld.id = "seo-jsonld";
        ld.type = "application/ld+json";
        document.head.appendChild(ld);
      }
      ld.textContent = JSON.stringify(jsonLd);
    } else if (ld) {
      ld.remove();
    }
  });
}

/** Keeps the canonical tag correct on every route, even ones that don't call useSEO directly. */
export function syncCanonical(pathname: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", `${SITE_ORIGIN}${pathname}`);
}

export { SITE_ORIGIN };
