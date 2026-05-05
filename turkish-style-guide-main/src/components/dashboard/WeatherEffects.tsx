import { motion } from "framer-motion";

type Props = {
  description: string;
};

/* ── Sunny: subtle sun flare in top-right ── */
function SunEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      <motion.div
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,200,0.45) 0%, rgba(255,220,100,0.15) 40%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute -top-2 -right-2 w-20 h-[1.5px] origin-left"
          style={{
            background: "linear-gradient(90deg, rgba(255,255,200,0.35), transparent)",
            transform: `rotate(${195 + i * 18}deg)`,
          }}
          animate={{ opacity: [0.15, 0.45, 0.15] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── Rain: thin falling lines ── */
function RainEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-[1px] rounded-full"
          style={{
            left: `${5 + i * 5.2}%`,
            height: `${10 + Math.random() * 8}px`,
            background: "linear-gradient(180deg, rgba(180,200,230,0.5), rgba(140,170,210,0.1))",
          }}
          animate={{ y: ["-10%", "900%"], opacity: [0.6, 0] }}
          transition={{
            duration: 0.7 + Math.random() * 0.3,
            repeat: Infinity,
            delay: Math.random() * 1.2,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

/* ── Snow: gentle drifting white dots ── */
function SnowEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${8 + i * 7.5}%`,
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
            background: "rgba(255,255,255,0.6)",
          }}
          animate={{
            y: ["0%", "700%"],
            x: [0, Math.sin(i) * 12, 0],
            opacity: [0.7, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2.5,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

/* ── Thunderstorm: lightning flash ── */
function ThunderstormEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {/* Rain underneath */}
      <RainEffect />
      {/* Lightning flashes */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{ background: "rgba(200,220,255,0.15)" }}
        animate={{ opacity: [0, 0, 0, 0, 0.6, 0, 0, 0.3, 0, 0, 0, 0, 0, 0, 0, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ── Fog / Mist: hazy drifting layers ── */
function FogEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${70 + i * 30}%`,
            height: `${30 + i * 10}px`,
            top: `${20 + i * 25}%`,
            left: "-10%",
            background: "rgba(255,255,255,0.08)",
            filter: "blur(12px)",
          }}
          animate={{ x: ["-5%", "15%", "-5%"] }}
          transition={{
            duration: 10 + i * 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ── Night (Clear): twinkling stars ── */
function NightEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${1 + (i % 2)}px`,
            height: `${1 + (i % 2)}px`,
            background: "rgba(255,255,255,0.7)",
            top: `${10 + ((i * 17) % 70)}%`,
            left: `${8 + ((i * 23) % 80)}%`,
          }}
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{
            duration: 1.5 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ── Cloudy: no animation, static ── */
function CloudEffect() {
  return null; // background gradient handles cloudy look
}

export type WeatherCondition =
  | "sunny"
  | "cloudy"
  | "rain"
  | "snow"
  | "thunderstorm"
  | "fog"
  | "night";

export function getWeatherCondition(description: string): WeatherCondition {
  const d = description.toLowerCase();
  if (d.includes("thunder")) return "thunderstorm";
  if (d.includes("rain") || d.includes("drizzle") || d.includes("shower")) return "rain";
  if (d.includes("snow")) return "snow";
  if (d.includes("fog") || d.includes("mist") || d.includes("haze")) return "fog";
  if (d.includes("cloud") || d.includes("overcast")) return "cloudy";
  if (d.includes("clear") || d.includes("sunny")) return "sunny";
  return "cloudy";
}

export function getWeatherGradient(condition: WeatherCondition): string {
  switch (condition) {
    case "sunny":
      return "linear-gradient(135deg, #4A90D9 0%, #87CEEB 60%, #B8E0F7 100%)";
    case "cloudy":
      return "linear-gradient(135deg, #8E9AAF 0%, #B8C4D4 50%, #A0AEC0 100%)";
    case "rain":
      return "linear-gradient(135deg, #3B4F6B 0%, #506882 50%, #445E78 100%)";
    case "snow":
      return "linear-gradient(135deg, #B8D4E8 0%, #D6E8F5 50%, #EEF3F8 100%)";
    case "thunderstorm":
      return "linear-gradient(135deg, #2D3436 0%, #3D4A52 50%, #2C3E50 100%)";
    case "fog":
      return "linear-gradient(135deg, #C9D0D8 0%, #DEE2E6 50%, #D5DAE0 100%)";
    case "night":
      return "linear-gradient(135deg, #0F0C29 0%, #1A1A4E 50%, #24243E 100%)";
    default:
      return "linear-gradient(135deg, #8E9AAF 0%, #B8C4D4 100%)";
  }
}

export function isLightCondition(condition: WeatherCondition): boolean {
  return condition === "snow" || condition === "fog";
}

export default function WeatherEffects({ description }: Props) {
  const condition = getWeatherCondition(description);

  switch (condition) {
    case "sunny":
      return <SunEffect />;
    case "rain":
      return <RainEffect />;
    case "snow":
      return <SnowEffect />;
    case "thunderstorm":
      return <ThunderstormEffect />;
    case "fog":
      return <FogEffect />;
    case "night":
      return <NightEffect />;
    case "cloudy":
      return <CloudEffect />;
    default:
      return null;
  }
}
