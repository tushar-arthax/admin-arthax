import { motion } from "framer-motion";
import { Users, Phone, TrendingUp, ArrowUpRight } from "lucide-react";

const audiences = [
  {
    icon: Users,
    title: "Sales Managers",
    role: "Team Leads",
    desc: "Handling 3–50 agents? Monitor activity, control the sales process, and coach with data — not gut feelings.",
    highlights: ["Real-time team dashboards", "Call compliance tracking", "Performance leaderboards"],
    metric: "2x",
    metricLabel: "Team Efficiency",
  },
  {
    icon: Phone,
    title: "Outbound SDRs",
    role: "Agents",
    desc: "A streamlined Android Dialer to make calls, follow processes, and send approved content — from one place.",
    highlights: ["One-tap calling", "Guided sales scripts", "WhatsApp follow-ups"],
    metric: "40%",
    metricLabel: "More Calls/Day",
  },
  {
    icon: TrendingUp,
    title: "Business Owners",
    role: "Leadership",
    desc: "Clear visibility into Finance, Revenue Achieved, and Business Analysis. Know exactly where growth stands.",
    highlights: ["Revenue analytics", "ROI tracking", "Business health reports"],
    metric: "360°",
    metricLabel: "Full Visibility",
  },
];

const TargetAudience = () => (
  <section id="audience" className="relative py-24 lg:py-36">
    <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[300px] rounded-full bg-primary/[0.02] blur-[120px]" />

    <div className="container mx-auto px-4 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-6 text-center"
      >
        <span className="inline-block rounded-full border border-border bg-muted/50 px-4 py-1 text-xs font-medium text-muted-foreground mb-4">
          Built For You
        </span>
        <h2 className="text-3xl font-extrabold md:text-4xl lg:text-5xl">
          Who is <span className="text-gradient-primary">ArthaX</span> For?
        </h2>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mx-auto mb-16 max-w-xl text-center text-muted-foreground"
      >
        Designed for every role in your sales organization — from the floor to the boardroom.
      </motion.p>

      <div className="grid gap-6 lg:grid-cols-3">
        {audiences.map((a, i) => (
          <motion.div
            key={a.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
            className="group relative rounded-2xl border border-border/60 bg-card/50 p-7 transition-all duration-300 hover:border-primary/20 hover:bg-card/80 overflow-hidden"
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
                  <a.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">{a.title}</h3>
                  <p className="text-xs text-muted-foreground">{a.role}</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>

            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{a.desc}</p>

            {/* Highlights */}
            <ul className="space-y-2.5 mb-6">
              {a.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                  {h}
                </li>
              ))}
            </ul>

            {/* Metric footer */}
            <div className="pt-5 border-t border-border/40">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-gradient-primary">{a.metric}</span>
                <span className="text-xs text-muted-foreground">{a.metricLabel}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TargetAudience;
