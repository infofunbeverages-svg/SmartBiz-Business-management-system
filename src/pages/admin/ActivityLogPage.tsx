import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  ClipboardList, User, Calendar, Tag, Search, RefreshCw, Clock, Eye, Info
} from 'lucide-react';
import { useCompany } from '../../utils/useCompany';
import { formatDistanceToNow } from 'date-fns';

const ActivityLogPage = () => {
  const { company } = useCompany();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null); // වැඩි විස්තර පෙන්වීමට

  useEffect(() => {
    if (company) {
      fetchLogs();
    }
  }, [company]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq('company_id', company?.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching logs:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getModuleColor = (module: string) => {
    switch (module?.toUpperCase()) {
      case 'INVENTORY': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'FINANCE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'SALES': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.module?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50/30">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <ClipboardList className="text-blue-600" size={32} />
            System <span className="text-blue-600">Activity Logs</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Audit Trail & User Actions</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by User, Action, Module..." 
              className="pl-10 pr-4 py-2.5 rounded-2xl border-none shadow-sm bg-white font-bold text-[11px] w-64 md:w-80 outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchLogs}
            className="p-2.5 bg-white rounded-2xl shadow-sm hover:bg-gray-50 text-blue-600 transition-all border border-gray-100 active:scale-95"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">User / Action</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Module</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Date & Time</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center font-black text-slate-300 uppercase animate-pulse italic">
                    Retrieving Audit Data...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center font-black text-slate-300 uppercase italic">
                    No activity logs found for {company?.name}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-800 leading-tight uppercase">
                            {log.profiles?.full_name || 'System User'}
                          </p>
                          <p className="text-[11px] font-bold text-slate-400 mt-1 italic leading-tight">
                            {log.action}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border flex items-center w-fit gap-1.5 ${getModuleColor(log.module)}`}>
                        <Tag size={10} />
                        {log.module}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                          <Calendar size={12} className="text-blue-500" />
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mt-1">
                          <Clock size={12} />
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </td>
                    <td className="p-5 text-right">
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
                        >
                            <Info size={18} />
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal (වැඩි විස්තර බැලීමට) */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 relative shadow-2xl">
            <button onClick={() => setSelectedLog(null)} className="absolute top-8 right-8 text-slate-400 hover:text-red-500 transition-colors">
              <RefreshCw className="rotate-45" size={24} />
            </button>
            <h2 className="text-xl font-black italic uppercase mb-6 flex items-center gap-2">
                <Info className="text-blue-600" /> Log <span className="text-blue-600">Details</span>
            </h2>
            
            <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Full Action</p>
                    <p className="text-sm font-bold text-slate-700">{selectedLog.action}</p>
                </div>
                {selectedLog.details && (
                    <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Metadata / Changes</p>
                        <pre className="text-[10px] font-mono text-blue-600 whitespace-pre-wrap">
                            {JSON.stringify(selectedLog.details, null, 2)}
                        </pre>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">Module: {selectedLog.module}</div>
                    <div className="p-4 bg-slate-100 text-slate-500 rounded-2xl">By: {selectedLog.profiles?.full_name}</div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogPage;