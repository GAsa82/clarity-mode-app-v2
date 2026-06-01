import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
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

const Index = () => {
  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />
      <Hero />
      <Benefits />
      <FocusRooms />
      <Library />
      <Store />
      <Dashboard />
      <Testimonials />
      <Pricing />
      <Creator />
      <Newsletter />
      <Footer />
      <WhatsAppChat />
    </main>
  );
};

export default Index;
