import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Rocket, Eye, Heart, Users, Target, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

const values = [
  { icon: Rocket, title: "Speed of Execution", desc: "We ship fast and iterate faster. Our customers see results within the first week." },
  { icon: Eye, title: "Radical Transparency", desc: "No vanity metrics. We believe in showing real data that drives real decisions." },
  { icon: Heart, title: "Customer Obsession", desc: "Every feature is born from actual customer pain points — not boardroom guesses." },
  { icon: Users, title: "Team Empowerment", desc: "We build tools that make every SDR and manager better at what they do." },
];

const milestones = [
  { year: "2023", title: "Founded in Bengaluru", desc: "ArthaX.ai was born to solve India's call-heavy sales execution problem." },
  { year: "2024", title: "Product-Market Fit", desc: "Onboarded 50+ SMB sales teams and validated the core CRM + call analytics platform." },
  { year: "2025", title: "AI Engine Launch", desc: "Launched Artha Bot — AI-powered conversation intelligence for Indian sales teams." },
  { year: "2026", title: "Scaling Nationally", desc: "Expanding across industries — real estate, EdTech, fintech, insurance, and more." },
];

const team = [
  { name: "Founder & CEO", role: "Product & Vision", icon: Target },
  { name: "CTO", role: "Engineering & AI", icon: Rocket },
  { name: "Head of Sales", role: "Growth & GTM", icon: Award },
];

const About = () => (
  <div className="min-h-screen">
    <Navbar />

    {/* Hero */}
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-44 lg:pb-28">
      <div className="absolute inset-0 grid-pattern opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="container relative mx-auto px-4 text-center lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary">
            Our Story
          </span>
          <h1 className="mb-6 text-4xl font-extrabold md:text-5xl lg:text-6xl">
            Building India's Sales <span className="text-gradient-primary">Execution Layer</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            We're on a mission to eliminate the chaos in call-based selling and empower every Indian sales team to hit their number — consistently.
          </p>
        </motion.div>
      </div>
    </section>

    {/* Mission */}
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="mb-6 text-3xl font-extrabold md:text-4xl">
              Why We <span className="text-gradient-primary">Exist</span>
            </h2>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              India has millions of SDRs making billions of calls every month — yet most teams still rely on spreadsheets, WhatsApp groups, and gut feeling to manage their sales process.
            </p>
            <p className="mb-4 text-muted-foreground leading-relaxed">
              We saw the gap: no CRM was built for the reality of Indian call-heavy sales. Not Salesforce. Not HubSpot. Not Zoho. These tools were designed for email-first, enterprise sales motions.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              ArthaX.ai is purpose-built for teams where the <span className="font-semibold text-foreground">phone call is the primary sales weapon</span>. We capture, analyze, and optimize every conversation to drive predictable revenue.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glow-card rounded-2xl border border-border bg-card p-10"
          >
            <div className="space-y-6">
              <div>
                <div className="mb-1 text-4xl font-extrabold text-gradient-primary">50+</div>
                <p className="text-sm text-muted-foreground">Sales teams onboarded</p>
              </div>
              <div className="border-t border-border" />
              <div>
                <div className="mb-1 text-4xl font-extrabold text-gradient-primary">1M+</div>
                <p className="text-sm text-muted-foreground">Calls analyzed monthly</p>
              </div>
              <div className="border-t border-border" />
              <div>
                <div className="mb-1 text-4xl font-extrabold text-gradient-primary">35%</div>
                <p className="text-sm text-muted-foreground">Average revenue uplift</p>
              </div>
              <div className="border-t border-border" />
              <div>
                <div className="mb-1 text-4xl font-extrabold text-gradient-primary">Bengaluru</div>
                <p className="text-sm text-muted-foreground">Headquartered in India's tech capital</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {/* Values */}
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center text-3xl font-extrabold md:text-4xl"
        >
          Our <span className="text-gradient-primary">Values</span>
        </motion.h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glow-card rounded-2xl border border-border bg-card p-6 text-center"
            >
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Timeline */}
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center text-3xl font-extrabold md:text-4xl"
        >
          Our <span className="text-gradient-primary">Journey</span>
        </motion.h2>

        <div className="relative mx-auto max-w-2xl">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border md:left-1/2" />

          {milestones.map((m, i) => (
            <motion.div
              key={m.year}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="relative mb-10 pl-16 md:pl-0"
            >
              {/* Dot */}
              <div className="absolute left-4 top-1 h-4 w-4 rounded-full border-2 border-primary bg-background md:left-1/2 md:-translate-x-1/2" />

              <div className={`md:w-[45%] ${i % 2 === 0 ? "md:mr-auto md:pr-8 md:text-right" : "md:ml-auto md:pl-8"}`}>
                <span className="text-sm font-bold text-primary">{m.year}</span>
                <h3 className="mt-1 text-lg font-bold">{m.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Leadership */}
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center text-3xl font-extrabold md:text-4xl"
        >
          Leadership <span className="text-gradient-primary">Team</span>
        </motion.h2>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-3">
          {team.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="glow-card rounded-2xl border border-border bg-card p-8 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <t.icon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">{t.name}</h3>
              <p className="text-sm text-muted-foreground">{t.role}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-border bg-card p-12 text-center md:p-20"
        >
          <div className="absolute inset-0 grid-pattern opacity-30" />
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-primary/10 blur-[100px]" />
          <div className="relative">
            <h2 className="mx-auto mb-6 max-w-xl text-3xl font-extrabold md:text-4xl">
              Want to join our <span className="text-gradient-primary">mission?</span>
            </h2>
            <p className="mx-auto mb-8 max-w-md text-muted-foreground">
              We're hiring passionate people who want to transform how India sells.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="text-base font-semibold px-10">View Open Roles</Button>
              <Button size="lg" variant="outline" className="text-base font-semibold border-primary/30 text-foreground hover:bg-primary/10">
                Contact Us
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>

    <Footer />
  </div>
);

export default About;
