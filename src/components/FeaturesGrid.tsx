import { motion } from "framer-motion";
import { Database, Bot, BarChart3, BookOpen, ShieldCheck, LayoutDashboard } from "lucide-react";

const features = [
  {
    icon: Database,
    title: "Centralized Lead Repository",
    desc: "Store, classify, and assign leads across all sources in one system of record.",
    tag: "Data",
  },
  {
    icon: Bot,
    title: "Artha Bot & AI Training",
    desc: "Managers teach the AI using real sales calls, best practices, and approved scripts.",
    tag: "AI",
  },
  {
    icon: BarChart3,
    title: "Advanced Call Analytics",
    desc: "Transcription, sentiment analysis, objection detection, and buying readiness flags.",
    tag: "Analytics",
  },
  {
    icon: BookOpen,
    title: "Content Bank & Playbooks",
    desc: "Approved sales scripts, brochures, and one-click WhatsApp follow-up templates.",
    tag: "Content",
  },
  {
    icon: ShieldCheck,
    title: "Sales Process Compliance",
    desc: "Define rules, track compliance, and prevent revenue leakage at every step.",
    tag: "Compliance",
  },
  {
    icon: LayoutDashboard,
    title: "Manager Visibility",
    desc: "Team performance dashboards, time-based breakdowns, and individual SDR metrics.",
    tag: "Dashboard",
  },
];

const FeaturesGrid = () => (
  <section id="features" className="relative py-24 lg:py-36">
    {/* Background accent */}
    <div className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 h-[500px] w-[300px] rounded-full bg-primary/[0.02] blur-[120px]" />

    <div className="container mx-auto px-4 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-6 text-center"
      >
        <span className="inline-block rounded-full border border-border bg-muted/50 px-4 py-1 text-xs font-medium text-muted-foreground mb-4">
          Platform Features
        </span>
        <h2 className="text-3xl font-extrabold md:text-4xl lg:text-5xl">
          Everything to <span className="text-gradient-primary">Win More Deals</span>
        </h2>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mx-auto mb-16 max-w-2xl text-center text-muted-foreground"
      >
        Purpose-built for call-heavy sales teams. Eliminate guesswork. Drive repeatable revenue.
      </motion.p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            className="group relative rounded-2xl border border-border/60 bg-card/50 p-7 transition-all duration-300 hover:border-primary/20 hover:bg-card/80 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.03]"
          >
            {/* Corner accent on hover */}
            <div className="absolute top-0 right-0 h-16 w-16 overflow-hidden rounded-tr-2xl opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute -top-8 -right-8 h-16 w-16 rotate-45 bg-primary/[0.06]" />
            </div>

            <div className="relative">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/[0.08] text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {f.tag}
                </span>
              </div>
              <h3 className="mb-2 text-base font-bold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesGrid;
