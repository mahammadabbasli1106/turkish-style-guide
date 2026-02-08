import { motion } from "framer-motion";
import { CloudSun, MapPin, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-fashion.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Stylish outfit on Istanbul street"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="bg-gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full">
              AI-Powered
            </span>
            <span className="text-sm text-muted-foreground">Made in Türkiye 🇹🇷</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="font-display text-5xl md:text-7xl font-bold leading-[1.1] mb-6 text-foreground"
          >
            Dress Smart,
            <br />
            <span className="text-gradient">Look Stunning</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-lg leading-relaxed"
          >
            Upload your wardrobe. Tell us where you're going. Our AI picks the perfect outfit 
            based on weather, location, and your style — every single day.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 mb-14"
          >
            <button className="bg-gradient-primary text-primary-foreground px-8 py-4 rounded-xl text-base font-semibold shadow-warm hover:opacity-90 transition-opacity">
              Start Your Style Journey
            </button>
            <button className="border border-border text-foreground px-8 py-4 rounded-xl text-base font-semibold hover:bg-secondary transition-colors">
              See How It Works
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex items-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <CloudSun size={18} className="text-primary" />
              <span>Weather-aware</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              <span>Location-based</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              <span>AI-curated</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
