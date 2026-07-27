import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { KnowledgeVaultHero } from "@/components/KnowledgeVaultHero";
import { Benefits } from "@/components/Benefits";
import { FocusRooms } from "@/components/FocusRooms";
import { Library } from "@/components/Library";
import { Store } from "@/components/Store";
import { Dashboard } from "@/components/Dashboard";
import { Testimonials } from "@/components/Testimonials";
import { Pricing } from "@/components/Pricing";
import { Creator } from "@/components/Creator";
import { Newsletter } from "@/components/Newsletter";
import { Footer } from "@/components/Footer";
import { WhatsAppChat } from "@/components/WhatsAppChat";
import { getSetting } from "@/lib/site-settings";

const Index = () => {
  // Defaults to visible if the admin has never touched the toggle.
  const [showTestimonials, setShowTestimonials] = useState(true);

  useEffect(() => {
    getSetting<boolean>("testimonials_on_home:clarity-mode").then((v) => {
      if (v !== null) setShowTestimonials(v);
    });
  }, []);

  // Client-rendered content doesn't exist yet when the browser makes its one
  // native attempt to scroll to a #hash fragment, so anchor links from other
  // pages (Navbar/Footer's /#library, /#store, /#dashboard) land at the top
  // instead of the section. Section order above Testimonials never changes,
  // so no layout-shift race to guard against here.
  useEffect(() => {
    if (window.location.hash) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
    }
  }, []);

  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />
      <KnowledgeVaultHero />
      <Benefits />
      <FocusRooms />
      <Library />
      <Store />
      <Dashboard />
      {showTestimonials && <Testimonials />}
      <Pricing />
      <Creator />
      <Newsletter />
      <Footer />
      <WhatsAppChat />
    </main>
  );
};

export default Index;
