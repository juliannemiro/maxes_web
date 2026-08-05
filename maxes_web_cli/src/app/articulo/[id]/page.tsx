import CatalogoHome from "../../../components/catalogo/CatalogoHome";

interface ProductLinkPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductLinkPage({ params }: ProductLinkPageProps) {
  const { id } = await params;
  let codigo = id;
  try {
    codigo = decodeURIComponent(id);
  } catch {
    // El endpoint resolverá el valor original si contiene un porcentaje literal.
  }
  return <CatalogoHome sharedArticuloCodigo={codigo} />;
}
