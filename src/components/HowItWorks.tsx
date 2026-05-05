import { motion } from "framer-motion";
import { Upload, Brain, CloudSun, Shirt } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload Your Wardrobe",
    description: "Snap photos of 15+ clothing items. Our AI instantly categorizes them — tops, bottoms, outerwear — all organized for you.",
  },
  {
    icon: Brain,
    step: "02",
    title: "AI Categorizes Everything",
    description: "Smart recognition sorts your pieces into upper body, lower body, and outdoor categories automatically.",
  },
  {
    icon: CloudSun,
    step: "03",
    title: "Weather & Location Check",
    description: "Tell us where you're headed or pick your style vibe. We check real-time weather and occasion details.",
  },
  {
    icon: Shirt,
    step: "04",
    title: "Get Your Perfect Outfit",
    description: "Receive a curated outfit from your own wardrobe, perfectly matched to weather, venue, and your personal style.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-secondary/50">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">How It Works</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 text-foreground">
            From Closet to <span className="text-gradient">Perfect Outfit</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-lg">
            Four simple steps to never worry about what to wear again.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative bg-card rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-shadow duration-300 group"
            >
              <span className="font-display text-6xl font-bold text-primary/10 absolute top-4 right-6">
                {step.step}
              </span>
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-5 shadow-warm group-hover:scale-110 transition-transform">
                <step.icon size={22} className="text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3 text-foreground">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
