import { redirect } from "next/navigation";

interface ProductLinkPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductLinkPage({ params }: ProductLinkPageProps) {
  const { id } = await params;
  const productId = Number.parseInt(id, 10);

  redirect(Number.isInteger(productId) && productId > 0 ? `/?articulo=${productId}` : "/");
}
