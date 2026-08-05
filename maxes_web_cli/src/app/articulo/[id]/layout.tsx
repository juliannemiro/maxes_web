import type { Metadata } from "next";
import { getArticuloByCodigo } from "../../../lib/publicApi";

interface ProductLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProductLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const codigo = id;
  const result = await getArticuloByCodigo(codigo);

  if (!result) {
    return {
      title: "Artículo no encontrado",
      robots: { index: false, follow: false },
    };
  }

  const product = result.articulo;
  const title = product.descripcion_publica || product.codigo || "Artículo MAXES";
  const category = product.rubro?.nombre ? ` en ${product.rubro.nombre}` : "";
  const description = `Encontrá ${title}${category} en el catálogo online de MAXES.`;

  return {
    title,
    description,
    alternates: { canonical: `/articulo/${encodeURIComponent(product.codigo || codigo)}` },
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName: "MAXES",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ProductLayout({ children }: ProductLayoutProps) {
  return children;
}
