import { User, Customer, Product, Order, Supplier, Transaction, DashboardStats } from '../types/models';

// Mock current user
export const currentUser: User = {
  id: '1',
  name: 'John Smith',
  email: 'john@simplerpco.com',
  role: 'admin',
  avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=80'
};

// Mock customers
export const customers: Customer[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '555-123-4567',
    address: '123 Business Ave, Suite 101, Business City, 12345',
    joinedDate: '2023-06-15',
    totalSpent: 12500,
    status: 'active'
  },
  {
    id: '2',
    name: 'Tech Innovations Ltd',
    email: 'info@techinnovations.com',
    phone: '555-987-6543',
    address: '456 Technology Park, Tech City, 67890',
    joinedDate: '2023-07-22',
    totalSpent: 8750,
    status: 'active'
  },
  {
    id: '3',
    name: 'Global Enterprises',
    email: 'sales@globalenterprises.com',
    phone: '555-456-7890',
    address: '789 International Blvd, Global City, 34567',
    joinedDate: '2023-08-10',
    totalSpent: 15750,
    status: 'active'
  },
  {
    id: '4',
    name: 'Sunset Industries',
    email: 'support@sunsetind.com',
    phone: '555-234-5678',
    address: '321 Sunset Drive, Industrial Zone, 89012',
    joinedDate: '2023-09-05',
    totalSpent: 6250,
    status: 'inactive'
  },
  {
    id: '5',
    name: 'City Services Inc',
    email: 'info@cityservices.com',
    phone: '555-876-5432',
    address: '555 Downtown Street, Metro City, 45678',
    joinedDate: '2023-10-18',
    totalSpent: 9500,
    status: 'active'
  }
];

// Mock products
export const products: Product[] = [
  {
    id: '1',
    name: 'Office Desk',
    description: 'Ergonomic office desk with adjustable height',
    sku: 'DESK-001',
    price: 299.99,
    stock: 15,
    category: 'Furniture',
    supplier: 'Furniture Depot',
    reorderLevel: 5,
    lastRestocked: '2023-12-10'
  },
  {
    id: '2',
    name: 'Ergonomic Chair',
    description: 'High-quality office chair with lumbar support',
    sku: 'CHAIR-002',
    price: 199.99,
    stock: 8,
    category: 'Furniture',
    supplier: 'Furniture Depot',
    reorderLevel: 10,
    lastRestocked: '2024-01-05'
  },
  {
    id: '3',
    name: 'Business Laptop',
    description: '15" business laptop with i7 processor',
    sku: 'TECH-003',
    price: 999.99,
    stock: 12,
    category: 'Electronics',
    supplier: 'Tech Suppliers Inc',
    reorderLevel: 3,
    lastRestocked: '2024-02-15'
  },
  {
    id: '4',
    name: 'Wireless Keyboard',
    description: 'Bluetooth wireless keyboard with numeric pad',
    sku: 'TECH-004',
    price: 59.99,
    stock: 25,
    category: 'Electronics',
    supplier: 'Tech Suppliers Inc',
    reorderLevel: 8,
    lastRestocked: '2024-01-20'
  },
  {
    id: '5',
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with long battery life',
    sku: 'TECH-005',
    price: 39.99,
    stock: 30,
    category: 'Electronics',
    supplier: 'Tech Suppliers Inc',
    reorderLevel: 10,
    lastRestocked: '2024-01-20'
  },
  {
    id: '6',
    name: 'Filing Cabinet',
    description: '3-drawer filing cabinet with lock',
    sku: 'FURN-006',
    price: 149.99,
    stock: 7,
    category: 'Furniture',
    supplier: 'Furniture Depot',
    reorderLevel: 5,
    lastRestocked: '2023-11-15'
  },
  {
    id: '7',
    name: 'Printer Paper',
    description: 'A4 printer paper, 500 sheets per ream',
    sku: 'SUPP-007',
    price: 9.99,
    stock: 100,
    category: 'Supplies',
    supplier: 'Office Supply Co',
    reorderLevel: 30,
    lastRestocked: '2024-02-01'
  },
  {
    id: '8',
    name: 'Ballpoint Pens',
    description: 'Pack of 12 black ballpoint pens',
    sku: 'SUPP-008',
    price: 7.99,
    stock: 50,
    category: 'Supplies',
    supplier: 'Office Supply Co',
    reorderLevel: 15,
    lastRestocked: '2024-02-10'
  }
];

// Mock orders
export const orders: Order[] = [
  {
    id: '1',
    customerId: '1',
    customerName: 'Acme Corporation',
    date: '2024-03-15',
    status: 'delivered',
    total: 1499.95,
    items: [
      {
        productId: '1',
        productName: 'Office Desk',
        quantity: 5,
        price: 299.99,
        total: 1499.95
      }
    ],
    paymentStatus: 'paid'
  },
  {
    id: '2',
    customerId: '2',
    customerName: 'Tech Innovations Ltd',
    date: '2024-03-18',
    status: 'shipped',
    total: 1999.98,
    items: [
      {
        productId: '3',
        productName: 'Business Laptop',
        quantity: 2,
        price: 999.99,
        total: 1999.98
      }
    ],
    paymentStatus: 'paid'
  },
  {
    id: '3',
    customerId: '3',
    customerName: 'Global Enterprises',
    date: '2024-03-20',
    status: 'processing',
    total: 1399.93,
    items: [
      {
        productId: '2',
        productName: 'Ergonomic Chair',
        quantity: 7,
        price: 199.99,
        total: 1399.93
      }
    ],
    paymentStatus: 'pending'
  },
  {
    id: '4',
    customerId: '5',
    customerName: 'City Services Inc',
    date: '2024-03-22',
    status: 'pending',
    total: 749.94,
    items: [
      {
        productId: '6',
        productName: 'Filing Cabinet',
        quantity: 5,
        price: 149.99,
        total: 749.94
      }
    ],
    paymentStatus: 'pending'
  },
  {
    id: '5',
    customerId: '1',
    customerName: 'Acme Corporation',
    date: '2024-03-23',
    status: 'pending',
    total: 999.60,
    items: [
      {
        productId: '7',
        productName: 'Printer Paper',
        quantity: 100,
        price: 9.99,
        total: 999.00
      },
      {
        productId: '8',
        productName: 'Ballpoint Pens',
        quantity: 10,
        price: 7.99,
        total: 79.90
      }
    ],
    paymentStatus: 'pending'
  }
];

// Mock suppliers
export const suppliers: Supplier[] = [
  {
    id: '1',
    name: 'Furniture Depot',
    contactName: 'Sarah Johnson',
    email: 'sarah@furnituredepot.com',
    phone: '555-111-2222',
    address: '100 Industrial Parkway, Warehouse District, 12345',
    products: ['Office Desk', 'Ergonomic Chair', 'Filing Cabinet'],
    status: 'active'
  },
  {
    id: '2',
    name: 'Tech Suppliers Inc',
    contactName: 'Michael Chen',
    email: 'michael@techsuppliers.com',
    phone: '555-333-4444',
    address: '200 Technology Drive, Tech Park, 67890',
    products: ['Business Laptop', 'Wireless Keyboard', 'Wireless Mouse'],
    status: 'active'
  },
  {
    id: '3',
    name: 'Office Supply Co',
    contactName: 'Jessica Williams',
    email: 'jessica@officesupplyco.com',
    phone: '555-555-6666',
    address: '300 Commerce Street, Business District, 54321',
    products: ['Printer Paper', 'Ballpoint Pens'],
    status: 'active'
  },
  {
    id: '4',
    name: 'Global Gadgets',
    contactName: 'David Miller',
    email: 'david@globalgadgets.com',
    phone: '555-777-8888',
    address: '400 Import Avenue, Port City, 98765',
    products: [],
    status: 'inactive'
  }
];

// Mock transactions
export const transactions: Transaction[] = [
  {
    id: '1',
    date: '2024-03-15',
    type: 'income',
    category: 'Sales',
    amount: 1499.95,
    description: 'Order #1: Acme Corporation',
    relatedId: '1'
  },
  {
    id: '2',
    date: '2024-03-18',
    type: 'income',
    category: 'Sales',
    amount: 1999.98,
    description: 'Order #2: Tech Innovations Ltd',
    relatedId: '2'
  },
  {
    id: '3',
    date: '2024-03-01',
    type: 'expense',
    category: 'Inventory',
    amount: 5000,
    description: 'Restock of office furniture'
  },
  {
    id: '4',
    date: '2024-03-05',
    type: 'expense',
    category: 'Utilities',
    amount: 450,
    description: 'Monthly electricity bill'
  },
  {
    id: '5',
    date: '2024-03-10',
    type: 'expense',
    category: 'Rent',
    amount: 2000,
    description: 'Office space monthly rent'
  }
];

// Dashboard stats
export const dashboardStats: DashboardStats = {
  totalSales: 3499.93,
  totalOrders: 5,
  totalCustomers: 5,
  lowStockItems: 2,
  revenueData: [
    { date: '2024-02-01', revenue: 2500 },
    { date: '2024-02-08', revenue: 1800 },
    { date: '2024-02-15', revenue: 3200 },
    { date: '2024-02-22', revenue: 2900 },
    { date: '2024-03-01', revenue: 1500 },
    { date: '2024-03-08', revenue: 2100 },
    { date: '2024-03-15', revenue: 3500 },
    { date: '2024-03-22', revenue: 3000 }
  ],
  topSellingProducts: [
    {
      id: '3',
      name: 'Business Laptop',
      quantity: 5,
      revenue: 4999.95
    },
    {
      id: '1',
      name: 'Office Desk',
      quantity: 8,
      revenue: 2399.92
    },
    {
      id: '2',
      name: 'Ergonomic Chair',
      quantity: 10,
      revenue: 1999.90
    },
    {
      id: '6',
      name: 'Filing Cabinet',
      quantity: 6,
      revenue: 899.94
    }
  ],
  recentOrders: [
    {
      id: '5',
      customerId: '1',
      customerName: 'Acme Corporation',
      date: '2024-03-23',
      status: 'pending',
      total: 999.60,
      items: [],
      paymentStatus: 'pending'
    },
    {
      id: '4',
      customerId: '5',
      customerName: 'City Services Inc',
      date: '2024-03-22',
      status: 'pending',
      total: 749.94,
      items: [],
      paymentStatus: 'pending'
    },
    {
      id: '3',
      customerId: '3',
      customerName: 'Global Enterprises',
      date: '2024-03-20',
      status: 'processing',
      total: 1399.93,
      items: [],
      paymentStatus: 'pending'
    }
  ]
};