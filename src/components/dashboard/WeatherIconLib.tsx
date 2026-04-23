import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Cloudy,
} from "lucide-react";

export type WeatherCondition =
  | "sunny"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "rainy"
  | "snowy"
  | "thunder"
  | "foggy";

export function getWeatherCondition(description: string): WeatherCondition {
  const d = description.toLowerCase();
  if (d.includes("thunder")) return "thunder";
  if (d.includes("snow")) return "snowy";
  if (d.includes("rain") || d.includes("drizzle") || d.includes("shower"))
    return "rainy";
  if (d.includes("fog") || d.includes("mist") || d.includes("haze"))
    return "foggy";
  if (d.includes("overcast")) return "overcast";
  if (d.includes("cloud") && d.includes("partly")) return "partly-cloudy";
  if (d.includes("cloud")) return "cloudy";
  if (d.includes("clear") || d.includes("sun") || d.includes("mainly"))
    return "sunny";
  return "cloudy";
}

export function getWeatherIcon(condition: WeatherCondition, size = 20) {
  const props = { size, strokeWidth: 1.8 };
  switch (condition) {
    case "sunny":
      return <Sun {...props} />;
    case "partly-cloudy":
      return <CloudSun {...props} />;
    case "cloudy":
      return <Cloud {...props} />;
    case "overcast":
      return <Cloudy {...props} />;
    case "rainy":
      return <CloudRain {...props} />;
    case "snowy":
      return <CloudSnow {...props} />;
    case "thunder":
      return <CloudLightning {...props} />;
    case "foggy":
      return <CloudFog {...props} />;
  }
}
