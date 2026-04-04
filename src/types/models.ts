export interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'agency_admin' | 'distributor' | 'sales_rep';
  agencyId?: string;
  avatar?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

export interface Agency {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  region: string;
  creditLimit: number;
  currentCredit: number;
  registeredDate: string;
  lastOrderDate?: string;
}

export interface AgencyStock {
  id: string;
  agencyId: string;
  productId: string;
  quantity: number;
  lastUpdated: string;
  minimumStock: number;
  maximumStock: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  agencyId: string;
  agencyName: string;
  salesRepId: string;
  salesRepName: string;
  orderDate: string;
  deliveryDate?: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: SalesOrderItem[];
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  paymentDueDate: string;
  notes?: string;
}

export interface SalesOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface SalesTarget {
  id: string;
  agencyId: string;
  salesRepId?: string;
  year: number;
  month: number;
  targetAmount: number;
  achievedAmount: number;
  status: 'in_progress' | 'achieved' | 'missed';
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinedDate: string;
  totalSpent: number;
  status: 'active' | 'inactive';
  agencyId: string;
  salesRepId: string;
  creditLimit: number;
  currentCredit: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  supplier: string;
  reorderLevel: number;
  lastRestocked: string;
  agencyPrice: number;
  customerPrice: number;
  minimumOrderQuantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: OrderItem[];
  paymentStatus: 'pending' | 'paid' | 'failed';
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  products: string[];
  status: 'active' | 'inactive';
}

export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  relatedId?: string;
  agencyId?: string;
}

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  lowStockItems: number;
  revenueData: RevenueData[];
  topSellingProducts: TopProduct[];
  recentOrders: Order[];
  agencyPerformance?: AgencyPerformance[];
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface AgencyPerformance {
  id: string;
  name: string;
  totalSales: number;
  targetAchievement: number;
  activeCustomers: number;
  pendingOrders: number;
}