import { ImageResponse } from "next/og";
import { getArticuloByCodigo } from "../../../lib/publicApi";

export const alt = "Artículo del catálogo MAXES";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function ProductOpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getArticuloByCodigo(id);
  const product = result?.articulo;
  const title = product?.descripcion_publica || product?.codigo || "Artículo MAXES";
  const productImage = product?.imagen_url || null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#f5f5f5",
        color: "#111111",
        fontFamily: "Arial, sans-serif",
        borderTop: "18px solid #f3c544",
      }}
    >
      <div
        style={{
          width: 520,
          margin: 46,
          marginRight: 30,
          borderRadius: 28,
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          boxShadow: "0 10px 34px rgba(0,0,0,0.10)",
        }}
      >
        {productImage ? (
          <img src={productImage} alt="" width={460} height={460} style={{ objectFit: "contain" }} />
        ) : (
          <div style={{ display: "flex", fontSize: 78, fontWeight: 900 }}>
            M<span style={{ color: "#f3c544" }}>@</span>XES
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "58px 58px 52px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 38, fontWeight: 900, letterSpacing: -2 }}>
          M<span style={{ color: "#dcae23" }}>@</span>XES
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 52 }}>
          {product?.rubro?.nombre && (
            <div style={{ background: "#f3c544", padding: "9px 16px", borderRadius: 999, fontSize: 18, fontWeight: 700 }}>
              {product.rubro.nombre}
            </div>
          )}
          {product?.codigo && (
            <div style={{ display: "flex", background: "#e5e5e5", padding: "9px 16px", borderRadius: 999, fontSize: 18, fontWeight: 700 }}>
              Cód. {product.codigo}
            </div>
          )}
        </div>
        <div style={{ fontSize: title.length > 62 ? 43 : 51, fontWeight: 800, lineHeight: 1.08, marginTop: 24 }}>
          {title}
        </div>
        <div style={{ marginTop: "auto", fontSize: 23, color: "#626262" }}>
          Disponible en nuestro catálogo online
        </div>
      </div>
    </div>,
    size
  );
}
