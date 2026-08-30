export type Client = {
  id: number;
  name: string;
  type: string;
  address: string | null;
  phone: string | null;
  contactPerson: string | null;
  notes: string | null;
  createdAt: string;
};

export type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  pricePerBox: number;
  unitsPerBox: number;
  minStock: number;
  createdAt: string;
};

export type StockItem = {
  productId: number;
  quantity: number;
  updatedAt: string;
  product?: Product;
};

export type OrderItem = {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product?: Product;
};

export type Order = {
  id: number;
  clientId: number;
  status: string;
  deliveryDate: string | null;
  totalAmount: number;
  paidAmount?: number;
  notes: string | null;
  createdAt: string;
  client?: Client;
  items?: OrderItem[];
};

export type RouteStop = {
  id: number;
  routeId: number;
  clientId: number;
  sequence: number;
  status: string;
  visitedAt: string | null;
  notes: string | null;
  client?: Client;
};

export type Route = {
  id: number;
  name: string;
  repName: string;
  routeDate: string;
  status: string;
  createdAt: string;
  stops?: RouteStop[];
};

export type DashboardStats = {
  totalClients: number;
  totalProducts: number;
  ordersToday: number;
  revenueMonth: number;
  lowStockCount: number;
  activeRoutes: number;
  recentOrders: Order[];
  lowStock: Array<Product & { quantity: number }>;
};
