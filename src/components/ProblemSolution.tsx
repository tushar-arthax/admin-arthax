import { motion } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";

const problems = [
  { text: "Manual SDR tracking with spreadsheets", detail: "Hours wasted on data entry" },
  { text: "Lost call data — no recordings", detail: "Zero accountability" },
  { text: "No manager visibility into conversations", detail: "Blind coaching decisions" },
  { text: "Inconsistent selling across the team", detail: "Revenue leakage everywhere" },
];

const solutions = [
  { text: "Auto-capture every sales call with AI", detail: "100% call coverage" },
  { text: "Standardize with playbooks & compliance", detail: "Repeatable processes" },
  { text: "Real-time dashboards & call intelligence", detail: "Data-driven management" },
  { text: "Coach from actual conversations", detail: "Targeted improvement" },
];

const ProblemSolution = () => (
  <section className="relative py-24 lg:py-36">
    {/* Divider line */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 h-16 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

    <div className="container mx-auto px-4 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-6 text-center"
      >
        <span className="inline-block rounded-full border border-border bg-muted/50 px-4 py-1 text-xs font-medium text-muted-foreground mb-4">
          Why ArthaX?
        </span>
        <h2 className="text-3xl font-extrabold md:text-4xl lg:text-5xl">
          From Chaos to <span className="text-gradient-primary">Clarity</span>
        </h2>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mx-auto mb-16 max-w-xl text-center text-muted-foreground"
      >
        See how ArthaX transforms the way your sales team operates — every single day.
      </motion.p>

      <div className="grid gap-6 lg:gap-0 lg:grid-cols-2">
        {/* Problem side */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl lg:rounded-r-none border border-destructive/10 bg-gradient-to-br from-destructive/[0.04] to-transparent p-8 lg:p-10"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <X className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Without ArthaX</h3>
              <p className="text-xs text-muted-foreground">The painful reality</p>
            </div>
          </div>
          <div className="space-y-5">
            {problems.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex items-start gap-4 group"
              >
                <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <X className="h-3 w-3 text-destructive" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{p.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Solution side */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl lg:rounded-l-none border border-primary/15 bg-gradient-to-br from-primary/[0.04] to-transparent p-8 lg:p-10"
        >
          {/* Subtle glow */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/[0.05] blur-[80px]" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">With ArthaX</h3>
                <p className="text-xs text-muted-foreground">The smarter way</p>
              </div>
            </div>
            <div className="space-y-5">
              {solutions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex items-start gap-4 group"
                >
                  <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="mt-8 pt-6 border-t border-primary/10"
            >
              <a href="#features" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4 group">
                See all features
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default ProblemSolution;
