import { forwardRef } from "react";

type Item = {
  name: string;
  category: string;
  image_url: string;
};

type Props = {
  items: Item[];
  occasion?: string;
  venue?: string;
  weather?: { temperature: number; description: string; location: string };
};

/**
 * Branded share card rendered off-screen and converted to PNG via html-to-image.
 * Fixed 1080x1920 (Instagram Story aspect) for clean export.
 */
const ShareCard = forwardRef<HTMLDivElement, Props>(
  ({ items, occasion, venue, weather }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1920,
          background:
            "linear-gradient(155deg, hsl(265, 60%, 55%) 0%, hsl(280, 65%, 50%) 50%, hsl(255, 55%, 35%) 100%)",
          fontFamily: "Satoshi, sans-serif",
          color: "white",
          padding: 80,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Decorative blobs */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            left: -160,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            filter: "blur(60px)",
          }}
        />

        {/* Top: logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, zIndex: 2 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src="/pwa-192x192.png"
              alt="tarzly"
              style={{ width: 56, height: 56, objectFit: "contain" }}
            />
          </div>
          <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -0.5 }}>
            tarzly.ai
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginTop: 80, zIndex: 2 }}>
          <div style={{ fontSize: 32, opacity: 0.7, fontWeight: 500 }}>
            Today's outfit
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              marginTop: 12,
              letterSpacing: -1.5,
            }}
          >
            {occasion ? capitalize(occasion) : "Styled"}
            {venue ? ` · ${venue}` : ""}
          </div>
          {weather && (
            <div style={{ fontSize: 30, opacity: 0.85, marginTop: 20, fontWeight: 500 }}>
              {weather.temperature}° · {weather.description} · {weather.location}
            </div>
          )}
        </div>

        {/* Items grid */}
        <div
          style={{
            marginTop: 70,
            flex: 1,
            display: "grid",
            gridTemplateColumns: items.length <= 2 ? "1fr 1fr" : "1fr 1fr",
            gap: 28,
            zIndex: 2,
          }}
        >
          {items.slice(0, 4).map((item, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.95)",
                borderRadius: 32,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: `url(${item.image_url}) center/cover no-repeat, hsl(255, 15%, 90%)`,
                  minHeight: 380,
                }}
              />
              <div style={{ padding: 24 }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "hsl(260, 15%, 12%)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    color: "hsl(260, 8%, 50%)",
                    textTransform: "capitalize",
                    marginTop: 4,
                  }}
                >
                  {item.category.replace("_", " ")}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              opacity: 0.9,
              letterSpacing: 0.3,
            }}
          >
            Styled by tarzly.ai
          </div>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default ShareCard;
