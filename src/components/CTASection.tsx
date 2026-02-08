import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 md:py-32">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-primary rounded-3xl p-12 md:p-20 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(35_80%_58%_/_0.3),transparent_60%)]" />
          <div className="relative z-10">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-5">
              Ready to Elevate Your Style?
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-lg mx-auto mb-10">
              Join the waitlist and be among the first to experience AI-powered fashion in Türkiye.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full sm:w-80 px-6 py-4 rounded-xl bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground placeholder:text-primary-foreground/50 border border-primary-foreground/20 focus:outline-none focus:border-primary-foreground/50 text-base"
              />
              <button className="w-full sm:w-auto bg-card text-foreground px-8 py-4 rounded-xl text-base font-semibold hover:bg-card/90 transition-colors flex items-center justify-center gap-2">
                Join Waitlist
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
