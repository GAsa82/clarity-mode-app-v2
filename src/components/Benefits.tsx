import { Brain, Flame, HeartPulse, Zap } from "lucide-react";

const benefits = [
  {
    icon: Brain,
    title: "Focus",
    desc: "Train deep attention. Cut through digital noise and reclaim your mind.",
  },
  {
    icon: Flame,
    title: "Confidence",
    desc: "Rebuild self-trust through daily discipline and grounded action.",
  },
  {
    icon: HeartPulse,
    title: "Emotional Control",
    desc: "Process feelings instead of being ruled by them. Stay calm under pressure.",
  },
  {
    icon: Zap,
    title: "Mental Energy",
    desc: "Reset dopamine. Protect your peak hours. Operate at full clarity.",
  },
];

export const Benefits = () => {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="container">
        <div className="max-w-2xl mb-16 md:mb-20">
          <p className="text-xs uppercase tracking-[0.25em] text-primary mb-4">
            What you build
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-light leading-tight text-gradient">
            Four pillars of the modern mind.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className="group relative bg-card-elevated border border-border rounded-2xl p-6 md:p-8 hover:border-primary/30 transition-all duration-500 hover:-translate-y-1"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                  <b.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-2xl mb-2 font-normal">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
