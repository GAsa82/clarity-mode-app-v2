import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppChat } from "@/components/WhatsAppChat";
import { MessageCircle, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />

      <div className="pt-32 pb-20 px-4">
        <div className="max-w-2xl mx-auto">

          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-light leading-tight mb-4">
              Get in <span className="text-gradient italic">Touch</span>
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Have a question, feedback, or want to explore a partnership?
              We respond within 24 hours.
            </p>
          </div>

          <div className="space-y-4">
            <a
              href="https://wa.me/919871927402"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-5 p-6 glass rounded-2xl border border-border hover:border-primary/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium">WhatsApp</p>
                <p className="text-sm text-muted-foreground">+91 98719 27402 — fastest response</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>

            <a
              href="mailto:gauravsinghdata6@gmail.com"
              className="flex items-center gap-5 p-6 glass rounded-2xl border border-border hover:border-primary/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Email</p>
                <p className="text-sm text-muted-foreground">gauravsinghdata6@gmail.com</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          </div>

          <div className="mt-12 p-6 glass rounded-2xl border border-border text-center">
            <p className="text-sm text-muted-foreground mb-4">
              For B2B inquiries, institute partnerships, or bulk licensing
            </p>
            <Button asChild variant="glass" size="sm">
              <a href="mailto:gauravsinghdata6@gmail.com?subject=Partnership%20Inquiry">
                Send partnership email
              </a>
            </Button>
          </div>

        </div>
      </div>

      <Footer />
      <WhatsAppChat />
    </main>
  );
}
