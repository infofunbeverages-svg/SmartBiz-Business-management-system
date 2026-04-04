import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Register ද Login ද කියලා දැනගන්න

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // අලුත් යූසර් කෙනෙක් හදන වෙලාවට
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert('Check your email for the confirmation link!');
    } else {
      // ලොග් වෙන වෙලාවට
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white shadow-xl rounded-2xl w-full max-w-md overflow-hidden border border-gray-100">
        
        {/* Header Section */}
        <div className="bg-blue-600 p-6 text-center">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">SmartBiz Login</h2>
          <p className="text-blue-100 text-xs mt-1">Enterprise Resource Planning System</p>
        </div>

        <form onSubmit={handleAuth} className="p-8">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
              <input 
                type="email" 
                placeholder="name@company.com" 
                required
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                required
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            <button 
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all transform active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Login')}
            </button>
          </div>

          <hr className="my-6 border-gray-100" />

          {/* අලුතින් එක් කළ බටන් දෙක */}
          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[11px] font-bold text-blue-600 uppercase border border-blue-100 py-2 rounded hover:bg-blue-50 transition-colors"
            >
              {isSignUp ? 'Back to Login' : 'Create New User'}
            </button>
            
            <button 
              type="button"
              onClick={() => window.location.href = '/admin/company-setup'}
              className="text-[11px] font-bold text-gray-600 uppercase border border-gray-100 py-2 rounded hover:bg-gray-50 transition-colors"
            >
              Create Company
            </button>
          </div>
          
          <p className="text-center text-[10px] text-gray-400 mt-6 uppercase">
            &copy; 2026 SmartBiz ERP. All rights reserved.
          </p>
        </form>
      </div>
    </div>
  );
}