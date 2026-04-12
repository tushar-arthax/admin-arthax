import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const FinalCTA = () => (
  <section className="relative py-24 lg:py-36">
    <div className="container mx-auto px-4 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.03] p-12 md:p-20"
      >
        {/* Patterns */}
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-60 w-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-primary/[0.04] blur-[80px]" />

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 h-24 w-24 overflow-hidden rounded-tl-3xl">
          <div className="absolute top-0 left-0 h-px w-24 bg-gradient-to-r from-primary/30 to-transparent" />
          <div className="absolute top-0 left-0 h-24 w-px bg-gradient-to-b from-primary/30 to-transparent" />
        </div>
        <div className="absolute bottom-0 right-0 h-24 w-24 overflow-hidden rounded-br-3xl">
          <div className="absolute bottom-0 right-0 h-px w-24 bg-gradient-to-l from-primary/30 to-transparent" />
          <div className="absolute bottom-0 right-0 h-24 w-px bg-gradient-to-t from-primary/30 to-transparent" />
        </div>

        <div className="relative text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"
          >
            <Sparkles className="h-6 w-6 text-primary" />
          </motion.div>

          <h2 className="mx-auto mb-5 max-w-2xl text-3xl font-extrabold md:text-4xl lg:text-5xl leading-[1.15]">
            Ready to standardize selling &{" "}
            <span className="text-gradient-primary">scale revenue?</span>
          </h2>
          <p className="mx-auto mb-10 max-w-lg text-muted-foreground">
            Join India's fastest-growing sales teams already using ArthaX.ai to close more deals, faster.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="text-base font-semibold px-10 gap-2 group">
              Schedule Your Free Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <p className="text-xs text-muted-foreground">No credit card required • Setup in 5 minutes</p>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default FinalCTA;
