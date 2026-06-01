import { NetflixBrowse } from "@/components/netflix/NetflixBrowse";

export const Library = () => {
  return (
    <section id="library" className="py-24 md:py-32 relative">
      <div className="container mb-10 md:mb-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">
              The Library
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
              Sharp ideas. <span className="text-silver italic">Short doses.</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Browse clarity sessions like a premium stream — hover to preview, click for the full
            experience.
          </p>
        </div>
      </div>

      <NetflixBrowse />
    </section>
  );
};
