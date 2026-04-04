import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { ClipboardList, User, Calendar, Tag, Search } from 'lucide-react';
import { format } from 'date-fns';

const ActivityLog = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_logs') // ඔයාගේ DB එකේ මේ නමින් table එකක් තියෙන්න ඕනේ
      .select(`
        *,
        profiles (full_name)
      `)
      .order('created_at', { ascending: false });

    if (!error) setLogs(data || []);
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => 
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.module?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center font-black uppercase tracking-widest">Loading Logs...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-600 rounded-2xl shadow-lg shadow-purple-200">
            <ClipboardList className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-800">System Activity Log</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tracking every move in the system</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by User, Action or Module..." 
            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl w-full md:w-80 text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none transition-all shadow-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Module</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action / Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                        <User size={14} />
                      </div>
                      <span className="text-xs font-black text-gray-700 uppercase">{log.profiles?.full_name || 'System'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-[9px] font-black uppercase">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-gray-600">{log.action}</p>
                    {log.details && <p className="text-[9px] text-gray-400 mt-0.5">{JSON.stringify(log.details)}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold uppercase">
                        {format(new Date(log.created_at), 'MMM dd, yyyy - HH:mm')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;