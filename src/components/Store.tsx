import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const GUMROAD_URL = "https://gauravdata.gumroad.com/l/";

const products = [
  {
    title: "30 Days to Mental Clarity",
    desc: "A guided 30-day system to silence overthinking and rebuild a focused mind.",
    price: 29,
    rating: 4.9,
    reviews: 412,
    tag: "Bestseller",
    accent: "from-blue-500/20 to-blue-900/40",
  },
  {
    title: "Overthinking Reset System",
    desc: "Worksheets, prompts, and protocols to break the mental loop. PDF + audio.",
    price: 24,
    rating: 4.8,
    reviews: 287,
    tag: "New",
    accent: "from-slate-400/20 to-slate-800/40",
  },
  {
    title: "Confidence Rebuild Blueprint",
    desc: "A practical framework to restore self-trust through small kept promises.",
    price: 34,
    rating: 4.9,
    reviews: 198,
    tag: "Top-rated",
    accent: "from-indigo-500/20 to-indigo-900/40",
  },
  {
    title: "Focus Like a Machine",
    desc: "Deep work routines, dopamine protocols, and the Clarity timer system.",
    price: 27,
    rating: 5.0,
    reviews: 156,
    tag: "Featured",
    accent: "from-cyan-500/15 to-blue-900/40",
  },
];

export const Store = () => {
  return (
    <section id="store" className="py-24 md:py-32 relative">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">
              Premium Tools
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
              Digital products that <span className="text-silver italic">change states.</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Crafted systems, journals, and audio packs to install clarity into your daily life.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((p, i) => (
            <article
              key={p.title}
              className="group flex flex-col bg-card-elevated border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-500 hover:-translate-y-1"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={`relative aspect-[4/5] bg-gradient-to-br ${p.accent} flex items-center justify-center overflow-hidden`}>
                <div className="absolute top-3 left-3 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full glass">
                  {p.tag}
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(215_90%_62%/0.25),transparent_70%)]" />
                <div className="relative px-6 text-center">
                  <p className="font-display text-2xl leading-tight text-foreground/95">
                    {p.title}
                  </p>
                  <div className="mt-4 w-12 h-px bg-foreground/30 mx-auto" />
                  <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-foreground/60">
                    Clarity Mode
                  </p>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                  {p.desc}
                </p>
                <div className="flex items-center gap-1 mb-4">
                  <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                  <span className="text-xs font-medium">{p.rating}</span>
                  <span className="text-xs text-muted-foreground">({p.reviews})</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-2xl">${p.price}</span>
                  <Button asChild variant="hero" size="sm">
                    <a
                      href={GUMROAD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => window.open(GUMROAD_URL, "_blank", "noopener,noreferrer")}
                    >
                      Buy now
                    </a>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
