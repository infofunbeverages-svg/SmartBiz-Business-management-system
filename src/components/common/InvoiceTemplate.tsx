import React from 'react';
import { format } from 'date-fns';

interface InvoiceProps {
  data: any; // ඉන්වොයිස් එකේ දත්ත
  company: any; // කොම්පැණි එකේ විස්තර
}

const InvoiceTemplate = ({ data, company }: InvoiceProps) => {
  return (
    <div id="invoice-print" className="p-8 bg-white max-w-[800px] mx-auto text-slate-800 font-sans">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-blue-600">
            {company?.name || 'SMARTBIZ'}
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
            {company?.address || 'Your Business Address, Sri Lanka'}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            TEL: {company?.phone || '011-XXXXXXX'}
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-black uppercase tracking-tight">INVOICE</h2>
          <p className="text-xs font-bold text-slate-500 uppercase mt-1">#{data.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
            {format(new Date(data.created_at), 'yyyy-MM-dd HH:mm')}
          </p>
        </div>
      </div>

      {/* Info Sections */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        <div>
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Billed To:</h3>
          <p className="text-sm font-black uppercase">{data.customer_name || 'Cash Customer'}</p>
          <p className="text-xs text-slate-500">{data.customer_phone || 'N/A'}</p>
        </div>
        <div className="text-right">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Handled By:</h3>
          <p className="text-sm font-black uppercase">{data.profiles?.full_name || 'Counter Staff'}</p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full mb-10">
        <thead>
          <tr className="border-b-2 border-slate-800">
            <th className="py-3 text-left text-[11px] font-black uppercase tracking-wider">Item Description</th>
            <th className="py-3 text-center text-[11px] font-black uppercase tracking-wider">Qty (Cs/Btl)</th>
            <th className="py-3 text-right text-[11px] font-black uppercase tracking-wider">Unit Price</th>
            <th className="py-3 text-right text-[11px] font-black uppercase tracking-wider">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.items?.map((item: any, index: number) => (
            <tr key={index}>
              <td className="py-4">
                <p className="text-xs font-black uppercase">{item.name}</p>
                <p className="text-[9px] text-slate-400 italic">Code: {item.sku || 'N/A'}</p>
              </td>
              <td className="py-4 text-center text-xs font-bold uppercase">
                {/* Cases සහ Bottles වෙනම පෙන්වීමට */}
                {Math.floor(item.quantity / (item.bpc || 12))} Cs {item.quantity % (item.bpc || 12) > 0 ? `+ ${item.quantity % (item.bpc || 12)} Btl` : ''}
              </td>
              <td className="py-4 text-right text-xs font-bold">LKR {item.price?.toLocaleString()}</td>
              <td className="py-4 text-right text-xs font-black italic">LKR {(item.price * item.quantity).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Calculation */}
      <div className="flex justify-end border-t-2 border-slate-100 pt-6">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Sub Total</span>
            <span>LKR {data.sub_total?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-red-500 uppercase">
            <span>Discount</span>
            <span>- LKR {data.discount_amount?.toLocaleString() || '0.00'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-t border-slate-200">
            <span className="text-sm font-black uppercase">Grand Total</span>
            <span className="text-xl font-black italic text-blue-600 underline decoration-double">
              LKR {data.total_amount?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 text-center border-t border-dashed border-slate-200 pt-8">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 italic">
          Thank You for your Business!
        </p>
        <p className="text-[8px] text-slate-300 mt-2">Software by SmartBiz ERP</p>
      </div>
    </div>
  );
};

export default InvoiceTemplate;