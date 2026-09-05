// A product as it's shown to the outside world — the shape both the REST
// API and the agent's tool results return. Deliberately flat and explicit
// so nothing here silently changes when the Prisma schema evolves.
export type ProductDTO = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number; // paise
  description: string;
  attributes: Record<string, unknown>;
  imageUrl: string | null;
  inventory: {
    quantity: number;
    inStock: boolean;
  };
  offers: OfferDTO[];
};

export type OfferDTO = {
  id: string;
  description: string;
  discountPct: number | null;
  discountFlat: number | null;
  validUntil: string | null;
};

export type ProductSearchResult = {
  products: ProductDTO[];
  total: number;
  limit: number;
  offset: number;
};
