import React from 'react';
import { BarChart3, DollarSign, Package, ShoppingCart, Users, LayoutDashboard, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import RevenueChart from '../../components/charts/RevenueChart';
import TableView from '../../components/common/TableView';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { dashboardStats } from '../../data/mockData';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Order, TopProduct } from '../../types/models';
// මම හදපු useCompany hook එක මෙතනින් ගමු
import { useCompany } from '../../hooks/useCompany';

const Dashboard: React.FC = () => {
  const { company, loading: companyLoading } = useCompany();

  const recentOrderColumns = [
    {
      header: 'Order ID',
      accessorKey: 'id',
      cell: (order: Order) => <span className="font-medium">#{order.id}</span>,
    },
    {
      header: 'Customer',
      accessorKey: 'customerName',
    },
    {
      header: 'Date',
      accessorKey: 'date',
      cell: (order: Order) => formatDate(order.date),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (order: Order) => <StatusBadge status={order.status} />,
    },
    {
      header: 'Total',
      accessorKey: 'total',
      cell: (order: Order) => formatCurrency(order.total),
    },
  ];

  const topProductColumns = [
    {
      header: 'Product',
      accessorKey: 'name',
    },
    {
      header: 'Quantity',
      accessorKey: 'quantity',
    },
    {
      header: 'Revenue',
      accessorKey: 'revenue',
      cell: (product: TopProduct) => formatCurrency(product.revenue),
    },
  ];

  return (
    <div className="space-y-6">
      {/* --- NEW HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" size={32} />
            Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`h-2 w-2 rounded-full ${company ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Building2 size={12} />
              {companyLoading ? 'Verifying Workspace...' : (company ? `Organization: ${company.name}` : 'No Workspace Linked')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Today's Date</p>
            <p className="text-sm font-bold text-gray-700">{formatDate(new Date().toISOString())}</p>
          </div>
        </div>
      </div>
      {/* --------------------------- */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Sales" 
          value={formatCurrency(dashboardStats.totalSales)} 
          icon={<DollarSign size={18} />}
          change={{ value: 12.5, isPositive: true }}
        />
        <StatCard 
          title="Total Orders" 
          value={dashboardStats.totalOrders} 
          icon={<ShoppingCart size={18} />}
          change={{ value: 8.2, isPositive: true }}
        />
        <StatCard 
          title="Total Customers" 
          value={dashboardStats.totalCustomers} 
          icon={<Users size={18} />}
          change={{ value: 5.3, isPositive: true }}
        />
        <StatCard 
          title="Low Stock Items" 
          value={dashboardStats.lowStockItems} 
          icon={<Package size={18} />}
          change={{ value: 2.1, isPositive: false }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Revenue Overview</CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">Weekly</Button>
                <Button variant="ghost" size="sm">Monthly</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={dashboardStats.revenueData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Top Products</CardTitle>
              <Button variant="ghost" size="sm" rightIcon={<BarChart3 size={14} />}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TableView
              data={dashboardStats.topSellingProducts}
              columns={topProductColumns}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="outline" size="sm">
              View All Orders
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TableView
            data={dashboardStats.recentOrders}
            columns={recentOrderColumns}
            onRowClick={(order) => console.log('Order clicked:', order.id)}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;