import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useVault } from "@/contexts/VaultContext";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/#library", label: "Library" },
  { href: "/research", label: "Research Papers" },
  { href: "/insights", label: "Insights" },
  { href: "/pricing", label: "Pricing" },
];

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();
  const { openVault } = useVault();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled ? "py-3" : "py-5"
        }`}
      >
        <div className="container">
          <nav
            className={`flex items-center justify-between rounded-full px-5 py-3 transition-all duration-500 ${
              scrolled ? "glass shadow-card-soft" : ""
            }`}
          >
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src={logoImg}
                alt="Clarity Mode"
                className="w-9 h-9 rounded-full object-cover shadow-glow"
              />
              <span className="font-display text-lg font-medium tracking-tight">
                Clarity Mode
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {publicLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <button
                onClick={() => openVault()}
                className="relative text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Vault
                <span className="absolute -top-1 -right-2.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Shield className="w-3 h-3" />
                      Admin
                    </Link>
                  )}
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Sign out
                  </Button>
                </div>
              ) : (
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
              )}
              <Button asChild variant="hero" size="sm">
                <Link to="/login">Start Free</Link>
              </Button>
            </div>

            <button
              className="md:hidden p-2 -mr-2"
              onClick={() => setOpen(!open)}
              aria-label="Menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </nav>

          {open && (
            <div className="md:hidden mt-2 glass rounded-2xl p-5 animate-fade-in">
              <div className="flex flex-col gap-4">
                {publicLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="text-base text-foreground/90 hover:text-primary"
                  >
                    {l.label}
                  </a>
                ))}
                <button
                  onClick={() => { openVault(); setOpen(false); }}
                  className="text-left text-base text-primary hover:text-primary/80 flex items-center gap-2"
                >
                  Vault
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </button>
                <div className="flex flex-col gap-2 pt-2 border-t border-border">
                  {user ? (
                    <>
                      <span className="text-xs text-muted-foreground px-2">{profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}</span>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2 px-2 py-1.5 text-sm text-primary"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          Admin Dashboard
                        </Link>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { signOut(); setOpen(false); }} className="justify-start">
                        <LogOut className="w-3.5 h-3.5 mr-2" />
                        Sign out
                      </Button>
                    </>
                  ) : (
                    <Link to="/login" onClick={() => setOpen(false)}>
                      <Button variant="ghost" size="sm" className="justify-start w-full">
                        Sign in
                      </Button>
                    </Link>
                  )}
                  <Button asChild variant="hero" size="sm">
                    <Link to="/login" onClick={() => setOpen(false)}>Start Free</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};