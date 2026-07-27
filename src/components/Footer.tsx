import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="relative border-t border-border/60 py-16 mt-12 backdrop-blur-sm bg-background/20">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-primary-gradient" />
              <span className="font-display text-lg">badly talks</span>
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
            {
              title: "Product",
              links: [
                { label: "Library", href: "/library" },
                { label: "Store", href: "/#store" },
                { label: "Dashboard", href: "/#dashboard" },
                { label: "Pricing", href: "/pricing" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "About", href: "/about" },
                { label: "Contact", href: "/contact" },
              ],
            },
            {
              title: "Legal",
              links: [
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Refunds", href: "/refunds" },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                {col.title}
              </p>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.includes("#") ? (
                      // Same-page anchors (e.g. /#library) need a real navigation
                      // for the browser to scroll to the id when linked from a
                      // different route — <Link> alone won't do it.
                      <a href={l.href} className="text-sm hover:text-primary transition-colors">{l.label}</a>
                    ) : (
                      <Link to={l.href} className="text-sm hover:text-primary transition-colors">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-border flex flex-col md:flex-row gap-4 justify-between items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} badly talks. Built quietly.
          </p>
          <p className="text-xs text-muted-foreground italic font-display">
            Clear mind. Strong self. Focused life.
          </p>
        </div>
      </div>
    </footer>
  );
};
