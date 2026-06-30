import creatorImg from "@/assets/lora-silver-VJVsRSjYS4A-unsplash.jpg";

export const Creator = () => {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="relative aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden bg-card-elevated border border-border shadow-glow">
              <img
                src={creatorImg}
                alt="Person reflecting by water"
                className="w-full h-full object-cover opacity-95 mix-blend-overlay filter brightness-95 saturate-90"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-background/80 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-black/10" />
            </div>
          </div>
          <div className="lg:col-span-3 order-1 lg:order-2">
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">
              About
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-light leading-tight mb-6">
              Built by someone who <span className="text-silver italic">lost the plot</span> — and slowly rebuilt the signal.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              badly talks started as a private journal during a year of burnout, anxiety, and digital overload.
              What pulled me out wasn't another productivity hack — it was a system for managing
              attention, emotion, and self-trust.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This platform is that system, refined for a generation drowning in noise.
              Built slowly, intentionally, and shared with the people ready to build their own clarity.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
