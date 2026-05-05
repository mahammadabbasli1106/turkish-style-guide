import { motion } from "framer-motion";
import { Camera, Wand2, Image } from "lucide-react";

const ShowcaseSection = () => {
  return (
    <section id="showcase" className="py-24 md:py-32 bg-secondary/50">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-widest">Virtual Try-On</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 text-foreground">
            See It <span className="text-gradient">On You</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-lg">
            Generate a preview of any outfit combination on your own image — 
            before you even get dressed.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              icon: Camera,
              title: "Upload Your Photo",
              description: "Share a full-body photo and let our AI learn your proportions.",
            },
            {
              icon: Wand2,
              title: "Pick an Outfit",
              description: "Choose from AI suggestions or mix and match your own combination.",
            },
            {
              icon: Image,
              title: "See the Result",
              description: "Get a realistic preview of how the outfit looks on you instantly.",
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="text-center bg-card rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-5 shadow-warm">
                <item.icon size={28} className="text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-3 text-foreground">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShowcaseSection;
