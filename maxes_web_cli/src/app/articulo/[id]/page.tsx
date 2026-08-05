import CatalogoHome from "../../../components/catalogo/CatalogoHome";

interface ProductLinkPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductLinkPage({ params }: ProductLinkPageProps) {
  const { id } = await params;
  return <CatalogoHome sharedArticuloCodigo={id} />;
}
