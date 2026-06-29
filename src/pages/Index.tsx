import { Link } from "react-router-dom";
import { Layers } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "gauravsinghdata6@gmail.com";

const Index = () => {
  const { user } = useAuth();
  // Use auth user email directly — profile is unreliable (schema mismatch on full_name vs name)
  const isAdmin = (user as { email?: string } | null)?.email === ADMIN_EMAIL;

  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />
      <KnowledgeVaultHero />
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

      {/* Admin-only Content Studio shortcut */}
      {isAdmin && (
        <Link
          to="/admin/content-studio"
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-primary/30 shadow-lg shadow-primary/10 hover:border-primary/60 hover:bg-primary/10 transition-all duration-200 group"
        >
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary">Content Studio</span>
        </Link>
      )}
    </main>
  );
};

export default Index;
