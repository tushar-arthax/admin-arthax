import { useState, useEffect } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "Features", path: "/features" },
  { label: "About", path: "/about" },
  { label: "Pricing", path: "/pricing" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/50 bg-background/90 backdrop-blur-xl shadow-lg shadow-background/20"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-18 items-center justify-between px-4 lg:px-8">
        <Link to="/" className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight">
          <span className="relative">
            {/* Artha<span className="text-gradient-primary">X</span>.ai */}
        <img src="/logo.png" alt="Logo" className="h-16 w-auto" />

            <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-gradient-to-r from-primary/50 to-transparent" />
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex mt-8">
          {navLinks.map((l) => {
            const active = location.pathname === l.path;
            return (
              <Link
                key={l.label}
                to={l.path}
                className={`relative px-4 py-2 text-sm transition-colors rounded-lg ${
                  active
                    ? "text-foreground font-semibold bg-muted/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {l.label}
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a href="https://app.arthax.ai" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Login
          </a>
          <Button size="sm" className="gap-1.5 group">
            Book a Demo
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden relative h-10 w-10 rounded-lg flex items-center justify-center text-foreground hover:bg-muted/30 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="px-4 pb-6 pt-4">
              {navLinks.map((l) => (
                <Link
                  key={l.label}
                  to={l.path}
                  className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    location.pathname === l.path
                      ? "text-foreground font-semibold bg-muted/50"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-border/50">
                <a href="#" className="px-3 py-2 text-sm text-muted-foreground">Login</a>
                <Button size="sm" className="gap-1.5">
                  Book a Demo <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
