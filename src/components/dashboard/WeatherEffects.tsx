import { motion } from "framer-motion";

type Props = {
  description: string;
};

function RainEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[2px] bg-primary-foreground/20 rounded-full"
          style={{
            left: `${8 + i * 8}%`,
            height: `${12 + Math.random() * 10}px`,
          }}
          animate={{ y: ["0%", "800%"], opacity: [0.7, 0] }}
          transition={{
            duration: 0.8 + Math.random() * 0.4,
            repeat: Infinity,
            delay: Math.random() * 1.5,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function SunEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      <motion.div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(45 100% 70% / 0.25) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Rays */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute -top-2 -right-2 w-16 h-[1px] origin-left"
          style={{
            background: "linear-gradient(90deg, hsl(45 100% 70% / 0.3), transparent)",
            transform: `rotate(${200 + i * 15}deg)`,
          }}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function CloudEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary-foreground/10"
          style={{
            width: `${40 + i * 20}px`,
            height: `${20 + i * 8}px`,
            top: `${15 + i * 25}%`,
          }}
          animate={{ x: ["-20%", "120%"] }}
          transition={{
            duration: 12 + i * 4,
            repeat: Infinity,
            delay: i * 3,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function SnowEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-primary-foreground/25"
          style={{ left: `${10 + i * 11}%` }}
          animate={{
            y: ["0%", "600%"],
            x: [0, Math.sin(i) * 15],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 2 + Math.random(),
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

export default function WeatherEffects({ description }: Props) {
  const d = description.toLowerCase();

  if (d.includes("rain") || d.includes("drizzle") || d.includes("shower")) return <RainEffect />;
  if (d.includes("snow")) return <SnowEffect />;
  if (d.includes("clear") || d.includes("sunny")) return <SunEffect />;
  if (d.includes("cloud") || d.includes("overcast") || d.includes("fog")) return <CloudEffect />;

  return null;
}
