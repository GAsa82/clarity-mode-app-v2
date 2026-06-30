import { useEffect, useState } from "react";
import { MessageSquarePlus, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getWebsiteIdBySlug } from "@/lib/site-settings";

type Testimonial = {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  rating: number | null;
  avatar_url: string | null;
};

export const Testimonials = () => {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const websiteId = await getWebsiteIdBySlug("clarity-mode");
      let query = supabase
        .from("testimonials")
        .select("id, name, role, quote, rating, avatar_url")
        .eq("published", true)
        .order("sort", { ascending: true })
        .order("created_at", { ascending: false });
      if (websiteId) query = query.eq("website_id", websiteId);
      const { data } = await query;
      setItems(data ?? []);
      setLoaded(true);
    })();
  }, []);

  return (
    <section className="py-24 md:py-32 relative">
      <div className="container">
        <div className="max-w-2xl mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">Voices</p>
          <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
            From the <span className="text-silver italic">community.</span>
          </h2>
        </div>

        {loaded && items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((t) => (
              <figure
                key={t.id}
                className="flex flex-col rounded-2xl border border-border bg-card-elevated/40 p-6 hover:border-primary/30 transition-colors"
              >
                {t.rating != null && (
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < (t.rating ?? 0) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                )}
                <blockquote className="text-sm text-muted-foreground leading-relaxed flex-1">
                  “{t.quote}”
                </blockquote>
                <figcaption className="flex items-center gap-3 mt-5 pt-5 border-t border-border/50">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt={t.name} className="w-9 h-9 rounded-full object-cover bg-secondary" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                      {t.name[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    {t.role && <p className="text-xs text-muted-foreground truncate">{t.role}</p>}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card-elevated/40 p-12 text-center max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <MessageSquarePlus className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-display text-xl font-light mb-3">
              No reviews yet — be among our first.
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-sm mx-auto">
              We only publish verified reviews from real users. As our community grows, genuine feedback
              will appear here. Reviews are never fabricated.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm hover:bg-primary/20 transition-colors"
            >
              Join early and share your experience
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
