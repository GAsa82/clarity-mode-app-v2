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
