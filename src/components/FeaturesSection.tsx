import { motion } from "framer-motion";
import wardrobeImage from "@/assets/wardrobe-flatlay.jpg";
import weatherImage from "@/assets/weather-style.jpg";

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">Features</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 text-foreground">
            Your Wardrobe, <span className="text-gradient">Reimagined</span>
          </h2>
        </motion.div>

        {/* Feature 1 */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Smart Wardrobe</span>
            <h3 className="font-display text-3xl md:text-4xl font-bold mt-3 mb-5 text-foreground">
              AI-Powered Closet Organization
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Upload photos of your clothes and our AI instantly categorizes them — t-shirts, sweaters, 
              jeans, jackets — everything sorted and ready for smart outfit combinations.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Upper Body", "Lower Body", "Outerwear", "Accessories"].map((tag) => (
                <span key={tag} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-sm font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden shadow-card-hover">
              <img src={wardrobeImage} alt="Organized wardrobe flat lay" className="w-full h-auto" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-card rounded-xl p-4 shadow-card border border-border">
              <p className="text-sm font-semibold text-foreground">15 items categorized</p>
              <p className="text-xs text-muted-foreground">in under 30 seconds</p>
            </div>
          </motion.div>
        </div>

        {/* Feature 2 */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-2 lg:order-1 relative"
          >
            <div className="rounded-2xl overflow-hidden shadow-card-hover max-w-md mx-auto">
              <img src={weatherImage} alt="Weather-based style suggestion" className="w-full h-auto" />
            </div>
            <div className="absolute -top-4 -right-4 bg-card rounded-xl p-4 shadow-card border border-border animate-float">
              <p className="text-sm font-semibold text-foreground">☀️ 28°C Istanbul</p>
              <p className="text-xs text-muted-foreground">Light layers recommended</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-1 lg:order-2"
          >
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Weather-Aware</span>
            <h3 className="font-display text-3xl md:text-4xl font-bold mt-3 mb-5 text-foreground">
              Dressed for the Forecast
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Going to a rooftop dinner in Kadıköy? A business meeting in Levent? 
              Tell us where, and we'll check the weather and suggest the perfect outfit 
              from your own closet — matching the vibe and the temperature.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Streetwear", "Classic", "Business", "Casual"].map((style) => (
                <span key={style} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-sm font-medium">
                  {style}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
