import { Link } from "react-router-dom";
import { useVault } from "@/contexts/VaultContext";

export const Footer = () => {
  const { openVault } = useVault();

  return (
    <footer className="relative border-t border-border/60 py-16 mt-12 backdrop-blur-sm bg-background/20">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-primary-gradient" />
              <span className="font-display text-lg">Clarity Mode</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              A premium platform for mental clarity, confidence, and focused living.
            </p>
            <div className="flex gap-3 mt-6">
              <a
                href="https://wa.me/919871927402"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                WhatsApp
              </a>
            </div>
          </div>
          {[
            { title: "Product", links: ["Library", "Store", "Dashboard", "Pricing"] },
            { title: "Company", links: ["About", "Contact"] },
            { title: "Legal", links: ["Privacy", "Terms", "Refunds"] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                {col.title}
              </p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link to={`/${l.toLowerCase()}`} className="text-sm hover:text-primary transition-colors">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Sister platform */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Ecosystem
            </p>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => openVault()}
                  className="text-sm hover:text-primary transition-colors text-left flex items-center gap-1.5 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 group-hover:bg-primary transition-colors shrink-0" />
                  Breakthrough Protocol Vault
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Clarity Mode. Built quietly.
          </p>
          <p className="text-xs text-muted-foreground italic font-display">
            Clear mind. Strong self. Focused life.
          </p>
        </div>
      </div>
    </footer>
  );
};
