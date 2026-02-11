import { motion } from "framer-motion";
import tarzlyIcon from "@/assets/tarzly-icon.png";

export default function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <img
          src={tarzlyIcon}
          alt="tarzly logo"
          className="w-24 h-24 rounded-full mb-6"
        />
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-3xl font-semibold text-foreground"
        >
          tarzly.ai
        </motion.h1>
      </motion.div>
    </div>
  );
}
