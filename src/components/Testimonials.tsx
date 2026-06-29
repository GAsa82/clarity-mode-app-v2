import { MessageSquarePlus } from "lucide-react";
import { Link } from "react-router-dom";

export const Testimonials = () => {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="container">
        <div className="max-w-2xl mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">Voices</p>
          <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
            From the <span className="text-silver italic">community.</span>
          </h2>
        </div>

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
      </div>
    </section>
  );
};
