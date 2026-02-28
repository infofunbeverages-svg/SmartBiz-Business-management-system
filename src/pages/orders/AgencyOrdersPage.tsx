import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import TableView from '../../components/common/TableView';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

const AgencyOrdersPage = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Distributers ලා දාපු orders විතරක් ගේනවා
  const fetchAgencyOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`*, customers(name)`)
      .eq('order_type', 'AGENCY') // Distributer orders වෙන් කරගන්න
      .order('created_at', { ascending: false });

    if (!error) setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAgencyOrders(); }, []);

  // Order එක Approve කරලා Invoice එකක් බවට පත් කිරීම
  const approveOrder = async (id: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'Processing', is_approved: true })
      .eq('id', id);

    if (!error) {
      alert("Order Approved Successfully!");
      fetchAgencyOrders();
    }
  };

  const columns = [
    { header: 'Order ID', cell: (o: any) => <span className="font-bold">#{o.order_no || o.id.slice(0,5)}</span> },
    { header: 'Distributer', cell: (o: any) => <span className="uppercase font-black text-xs">{o.customers?.name}</span> },
    { header: 'Date', cell: (o: any) => formatDate(o.order_date) },
    { 
      header: 'Status', 
      cell: (o: any) => (
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-orange-500" />
          <span className="text-orange-600 font-bold text-xs uppercase">New Order</span>
        </div>
      )
    },
    { header: 'Amount', cell: (o: any) => <span className="font-mono font-bold">{formatCurrency(o.net_amount)}</span> },
    { 
      header: 'Action', 
      cell: (o: any) => (
        <div className="flex gap-2">
          <button onClick={() => approveOrder(o.id)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-green-700">
            APPROVE
          </button>
          <button className="text-gray-400 hover:text-red-500"><XCircle size={18}/></button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Agency Orders</h1>
          <p className="text-sm text-gray-500 font-medium">Review and approve orders from Distributers</p>
        </div>
        <div className="bg-orange-100 text-orange-600 px-4 py-2 rounded-2xl flex items-center gap-2">
          <ShoppingBag size={20} />
          <span className="font-black">{orders.length} PENDING</span>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <TableView data={orders} columns={columns} emptyMessage="No new agency orders at the moment." />
      </div>
    </div>
  );
};

export default AgencyOrdersPage;