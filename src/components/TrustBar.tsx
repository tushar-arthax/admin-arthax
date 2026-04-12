import { motion } from "framer-motion";
import { Shield, Clock, Zap, Headphones } from "lucide-react";

const items = [
  { icon: Shield, label: "SOC 2 Compliant" },
  { icon: Clock, label: "99.9% Uptime" },
  { icon: Zap, label: "< 100ms Latency" },
  { icon: Headphones, label: "24/7 Support" },
];

const TrustBar = () => (
  <section className="border-y border-border/40 bg-card/30">
    <div className="container mx-auto px-4 lg:px-8">
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 py-8">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-2.5 text-muted-foreground"
          >
            <item.icon className="h-4 w-4 text-primary/60" />
            <span className="text-sm font-medium">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustBar;
