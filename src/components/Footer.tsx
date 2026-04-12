import { MapPin, Phone, Mail, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Features", to: "/features" },
  { label: "About", to: "/about" },
  { label: "Pricing", to: "/pricing" },
];

const supportLinks = [
  { label: "Contact Us", href: "#" },
  { label: "Help Center", href: "#" },
  { label: "FAQs", href: "#" },
];

const Footer = () => (
  <footer className="border-t border-border/50 bg-background">
    {/* Main footer */}
    <div className="container mx-auto px-4 lg:px-8 py-16">
      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
        {/* Brand col */}
        <div className="lg:col-span-4">
          <span className="text-xl font-extrabold">
            Artha<span className="text-gradient-primary">X</span>.ai
          </span>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
            India's First Revenue Accelerated Sales CRM. Capture every call. Close every deal.
          </p>

          {/* Newsletter */}
          <div className="mt-8">
            <p className="mb-3 text-sm font-semibold">Stay in the loop</p>
            <div className="flex overflow-hidden rounded-xl border border-border/60 bg-card/50 focus-within:border-primary/30 transition-colors">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60"
              />
              <button className="flex items-center justify-center bg-primary px-4 text-primary-foreground transition-opacity hover:opacity-90">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="lg:col-span-2 lg:col-start-6">
          <h4 className="mb-5 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Quick Links</h4>
          <ul className="space-y-3">
            {quickLinks.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div className="lg:col-span-2">
          <h4 className="mb-5 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Support</h4>
          <ul className="space-y-3">
            {supportLinks.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <h4 className="mb-4 mt-8 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Career</h4>
          <ul className="space-y-3">
            {["Jobs", "Hiring"].map((l) => (
              <li key={l}>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="lg:col-span-3">
          <h4 className="mb-5 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Contact</h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
              <span className="text-sm text-muted-foreground leading-relaxed">
                40, Central Excise Layout, CHBS Layout, Stage 2, Vijayanagar, Bengaluru, Karnataka 560040
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-primary/60" />
              <a href="tel:+919611211845" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                +91 96112 11845
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-primary/60" />
              <a href="mailto:growth@arthax.ai" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                growth@arthax.ai
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-border/30">
      <div className="container mx-auto px-4 lg:px-8 flex flex-col sm:flex-row items-center justify-between py-5 gap-2">
        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} ArthaX.ai. All rights reserved.
        </p>
        <div className="flex gap-6 text-xs text-muted-foreground/60">
          <a href="#" className="hover:text-muted-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-muted-foreground transition-colors">Terms</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
