const testimonials = [
  {
    quote:
      "I deleted three apps after one week. The clarity sessions actually re-wire how I open my phone.",
    name: "Maya R.",
    role: "Product designer, 26",
  },
  {
    quote:
      "Felt like therapy and a productivity coach rolled into something I look forward to opening daily.",
    name: "Jordan T.",
    role: "Founder, 31",
  },
  {
    quote:
      "The Overthinking Reset alone was worth it. I think clearly for the first time in years.",
    name: "Sam K.",
    role: "Med student, 24",
  },
];

export const Testimonials = () => {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="container">
        <div className="max-w-2xl mb-16">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">
            Voices
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-light leading-tight">
            From the <span className="text-silver italic">quietly transformed.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="bg-card-elevated border border-border rounded-2xl p-8 hover:border-primary/30 transition-all duration-500"
            >
              <blockquote className="font-display text-xl leading-snug text-gradient mb-8">
                "{t.quote}"
              </blockquote>
              <figcaption>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};
