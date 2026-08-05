import { ImageResponse } from "next/og";

export const alt = "MAXES - Tus insumos en un solo lugar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#111111",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 470,
          height: 470,
          borderRadius: 999,
          background: "#f3c544",
          right: -100,
          top: -150,
          opacity: 0.95,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: 999,
          border: "38px solid #f3c544",
          right: 120,
          bottom: -130,
          opacity: 0.26,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 82px",
          width: 900,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 104, fontWeight: 900, letterSpacing: -6 }}>
          M<span style={{ color: "#f3c544" }}>@</span>XES
        </div>
        <div style={{ width: 118, height: 12, background: "#f3c544", margin: "24px 0 30px" }} />
        <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.08 }}>Tus insumos en un solo lugar</div>
        <div style={{ fontSize: 27, color: "#c9c9c9", marginTop: 24 }}>
          Explorá nuestro catálogo y armá tu pedido online
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 52,
          bottom: 42,
          display: "flex",
          alignItems: "center",
          background: "white",
          color: "#111111",
          padding: "14px 23px",
          borderRadius: 999,
          fontSize: 21,
          fontWeight: 700,
        }}
      >
        CATÁLOGO ONLINE
      </div>
    </div>,
    size
  );
}
