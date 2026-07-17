import { Rubro, Articulo, CarruselHome, Configuracion, Pedido } from "../types";

export interface PedidoCreado {
  id: number;
  cliente_nombre: string;
  doc_tipo: string;
  doc_numero: string;
  total: number;
}

export interface CatalogoInicial {
  rubros: Rubro[];
  carruseles: CarruselHome[];
  config: Configuracion | null;
  articulos: Articulo[];
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const apiService = {
  // Get initial public catalog in a single request.
  async getCatalogoInicial(): Promise<CatalogoInicial> {
    return fetchJson<CatalogoInicial>("/api/public/catalogo");
  },

  // Get active rubros
  async getRubros(): Promise<{ rubros: Rubro[] }> {
    return fetchJson<{ rubros: Rubro[] }>("/api/public/rubros");
  },

  // Get articles catalog
  async getArticulos(params?: {
    rubro_id?: number;
    search?: string;
    destacado?: boolean;
    page?: number;
    limit?: number;
    sort_by?: string;
    tipo_compra?: "mayorista" | "minorista";
    ids?: number[];
  }): Promise<{
    articulos: Articulo[];
    pagination: {
      totalCount: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  }> {
    const query = new URLSearchParams();
    if (params) {
      if (params.rubro_id !== undefined) query.append("rubro_id", params.rubro_id.toString());
      if (params.search) query.append("search", params.search);
      if (params.destacado !== undefined) query.append("destacado", params.destacado.toString());
      if (params.page !== undefined) query.append("page", params.page.toString());
      if (params.limit !== undefined) query.append("limit", params.limit.toString());
      if (params.sort_by) query.append("sort_by", params.sort_by);
      if (params.tipo_compra) query.append("tipo_compra", params.tipo_compra);
      if (params.ids?.length) query.append("ids", params.ids.join(","));
    }

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return fetchJson<{
      articulos: Articulo[];
      pagination: {
        totalCount: number;
        totalPages: number;
        currentPage: number;
        limit: number;
      };
    }>(`/api/public/articulos${queryString}`);
  },

  // Get details of a single product
  async getArticuloById(id: number): Promise<{ articulo: Articulo }> {
    return fetchJson<{ articulo: Articulo }>(`/api/public/articulos/${id}`);
  },

  // Get banners
  async getCarruseles(): Promise<{ carruseles: CarruselHome[] }> {
    return fetchJson<{ carruseles: CarruselHome[] }>("/api/public/carruseles");
  },

  // Get configuration
  async getConfig(): Promise<{ config: Configuracion }> {
    return fetchJson<{ config: Configuracion }>("/api/public/config");
  },

  // Place order
  async createPedido(pedido: Pedido): Promise<{ success: boolean; order: PedidoCreado }> {
    return fetchJson<{ success: boolean; order: PedidoCreado }>("/api/public/pedido", {
      method: "POST",
      body: JSON.stringify(pedido),
    });
  },
};
