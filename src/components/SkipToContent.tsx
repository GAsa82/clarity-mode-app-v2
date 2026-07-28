/**
 * WCAG 2.4.1 (Bypass Blocks, Level A) — there was no way to skip the nav
 * and get straight to page content. A keyboard or screen-reader user had to
 * tab through the full Navbar (5 links, auth controls, mobile menu button)
 * on every single page before reaching anything unique to that page.
 *
 * No shared page layout exists in this codebase — every public page
 * independently renders <Navbar /> then its own <main>, so there's no
 * single wrapper to attach an id to. Rendered once here at the app root
 * instead: on activation it finds whichever <main> the current route
 * rendered and focuses it directly, working uniformly across every page
 * without editing each one.
 */
export function SkipToContent() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const main = document.querySelector("main");
    if (!main) return;
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    (main as HTMLElement).focus();
    main.scrollIntoView();
  };

  return (
    <a
      href="#main-content"
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2.5 focus:rounded-full focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
    >
      Skip to content
    </a>
  );
}
