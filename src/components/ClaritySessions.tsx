import { NetflixBrowse } from "@/components/netflix/NetflixBrowse";

/**
 * Homepage browse for Clarity Sessions (video/audio).
 *
 * Previously called "The Library", which collided with the /library page that
 * holds protocols, frameworks and templates — two different things under one
 * name, in the nav, the footer and the hero CTA. This section is named for
 * what it actually renders: content_items of type 'session'.
 */
export const ClaritySessions = () => {
  return (
    <section id="sessions" className="py-24 md:py-32 relative">
      <div className="container mb-10 md:mb-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">
              Clarity Sessions
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
              Sharp ideas. <span className="text-silver italic">Short doses.</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Watch and listen like a premium stream — hover to preview, click for the full
            experience.
          </p>
        </div>
      </div>

      <NetflixBrowse />
    </section>
  );
};
