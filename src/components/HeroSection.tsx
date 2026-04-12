import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Play, PhoneCall, BarChart3, TrendingUp } from "lucide-react";
import heroDashboard from "@/assets/hero-dashboard.jpg";

const stats = [
  { value: "3x", label: "Revenue Growth" },
  { value: "98%", label: "Call Capture" },
  { value: "40%", label: "Faster Closing" },
];

const HeroSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <section ref={ref} id="home" className="relative overflow-hidden pt-28 pb-12 lg:pt-40 lg:pb-24">
      {/* Background layers */}
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="pointer-events-none absolute -top-60 left-1/3 h-[600px] w-[800px] rounded-full bg-primary/[0.04] blur-[150px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-primary/[0.03] blur-[120px]" />

      <div className="container relative mx-auto px-4 lg:px-8">
        {/* Top badge row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center mb-8"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 text-xs font-medium text-primary backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            India's First Revenue Accelerated Sales CRM
          </span>
        </motion.div>

        {/* Headline — centered */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-center max-w-4xl mx-auto mb-8"
        >
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl lg:text-[3.75rem]">
            Fix Your Call-Based
            <br className="hidden sm:block" />
            Sales Execution.{" "}
            <span className="text-gradient-primary">Accelerate Revenue.</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mx-auto mb-10 max-w-2xl text-center text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          Capture every sales call, analyze conversations with AI, and give your
          managers total visibility. Built for India's fast-growing, call-heavy
          sales teams.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-16"
        >
          <Button size="lg" className="text-base font-semibold gap-2 group px-8">
            Book a Demo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base font-semibold border-border text-foreground hover:bg-muted/50 gap-2"
            asChild
          >
            <Link to="/features">
              <Play className="h-4 w-4" />
              Explore Features
            </Link>
          </Button>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="flex items-center justify-center gap-8 md:gap-16 mb-16"
        >
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-gradient-primary">{s.value}</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Dashboard image with floating cards */}
        <motion.div
          style={{ y: imageY, scale: imageScale }}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
          className="relative mx-auto max-w-5xl"
        >
          {/* Glow behind image */}
          <div className="absolute inset-0 -m-4 rounded-3xl bg-primary/[0.03] blur-2xl" />

          <div className="relative rounded-2xl border border-border/60 bg-card/50 p-2 shadow-2xl shadow-background/50 backdrop-blur-sm">
            <img
              src={heroDashboard}
              alt="ArthaX.ai Dashboard showing call analytics and sales metrics"
              width={1280}
              height={800}
              className="w-full rounded-xl"
              loading="eager"
            />
          </div>

          {/* Floating card — top left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="absolute -top-6 -left-4 md:-left-12 hidden sm:flex items-center gap-3 rounded-xl border border-border/60 bg-card/90 backdrop-blur-md px-4 py-3 shadow-xl"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <PhoneCall className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Today's Calls</p>
              <p className="text-sm font-bold">1,247</p>
            </div>
          </motion.div>

          {/* Floating card — top right */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="absolute -top-4 -right-4 md:-right-10 hidden sm:flex items-center gap-3 rounded-xl border border-border/60 bg-card/90 backdrop-blur-md px-4 py-3 shadow-xl"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-sm font-bold text-primary">87.3%</p>
            </div>
          </motion.div>

          {/* Floating card — bottom center */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute -bottom-5 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-3 rounded-xl border border-primary/20 bg-card/90 backdrop-blur-md px-5 py-3 shadow-xl"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Revenue This Month</p>
              <p className="text-sm font-bold">₹24.8L <span className="text-primary text-xs">+18%</span></p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
