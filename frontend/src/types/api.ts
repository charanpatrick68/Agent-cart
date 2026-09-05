export type HealthResponse = {
  status: "ok";
  time: string;
  db: "ok" | "error";
};

export type ApiError = {
  error: { code: string; message: string };
};

export type OfferDTO = {
  id: string;
  description: string;
  discountPct: number | null;
  discountFlat: number | null;
  validUntil: string | null;
};

export type ProductDTO = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number; // paise
  description: string;
  attributes: Record<string, unknown>;
  imageUrl: string | null;
  inventory: { quantity: number; inStock: boolean };
  offers: OfferDTO[];
};

export type ProductSearchResult = {
  products: ProductDTO[];
  total: number;
  limit: number;
  offset: number;
};

export type ChatResponse = {
  sessionId: string;
  reply: string;
  pendingOrder: { orderId: string; total: number; itemCount: number } | null;
};

export type OrderLineDTO = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderDTO = {
  id: string;
  status: "PENDING" | "PAYMENT_PENDING" | "PAID" | "FAILED" | "CANCELLED";
  items: OrderLineDTO[];
  subtotal: number;
  shipping: number;
  total: number;
  razorpayOrderId: string | null;
  createdAt: string;
};

export type CreatePaymentResponse = {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  orderId: string;
};

export type VerifyPaymentResponse = {
  status: string;
  orderId: string;
};

export type RevenueOverview = {
  gmv: number;
  totalOrders: number;
  paidOrders: number;
  failedOrders: number;
  averageOrderValue: number;
};

export type AgentCommerceMetrics = {
  totalSessions: number;
  searchCalls: number;
  checkoutsInitiated: number;
  completedPurchases: number;
  toolCallSuccessRate: number;
};

export type MerchantOverview = {
  revenue: RevenueOverview;
  agentMetrics: AgentCommerceMetrics;
};

export type AuditLogDTO = {
  id: string;
  sessionId: string | null;
  action: string;
  input: unknown;
  output: unknown;
  reasoning: string | null;
  success: boolean;
  createdAt: string;
};

export type MerchantOrderSummary = {
  id: string;
  status: string;
  total: number;
  itemCount: number;
  createdAt: string;
};
