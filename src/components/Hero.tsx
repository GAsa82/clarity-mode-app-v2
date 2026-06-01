import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import heroOrb from "@/assets/hero-orb.jpg";

export const Hero = () => {
  return (
    <section className="relative pt-32 pb-24 md:pt-44 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 bg-hero pointer-events-none opacity-90" aria-hidden />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[900px] md:h-[900px] opacity-25 pointer-events-none">
        <img
          src={heroOrb}
          alt=""
          className="w-full h-full object-cover rounded-full animate-float"
          style={{ filter: "blur(20px)" }}
        />
      </div>

      <div className="container relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs tracking-wide text-muted-foreground">
              AI-powered mental clarity platform
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-light leading-[1.05] mb-8 animate-fade-up">
            <span className="text-gradient">Understand Your Mind</span>
            <br />
            <span className="text-silver italic font-normal">Like Never Before</span>
          </h1>

          <p
            className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed animate-fade-up [animation-delay:0.15s]"
          >
            An AI coach that helps you discover emotional patterns, gain clarity,
            and track your personal growth — one day at a time.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-up [animation-delay:0.3s]">
            <Button asChild variant="hero" size="xl" className="group">
              <Link to="/login">
                Start Free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="glass" size="xl" className="group">
              <Play className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
              Watch Demo
            </Button>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-x-10 gap-y-3 text-xs uppercase tracking-[0.2em] text-muted-foreground/70 animate-fade-in [animation-delay:0.6s]">
            <span>AI-Powered Insights</span>
            <span className="opacity-30">·</span>
            <span>Emotional Tracking</span>
            <span className="opacity-30">·</span>
            <span>Personal Growth</span>
          </div>
        </div>
      </div>
    </section>
  );
};