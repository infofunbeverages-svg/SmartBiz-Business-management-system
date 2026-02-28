import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import Button from '../../components/ui/Button'; 
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Building2, MapPin, Phone, Mail, Globe, Hash } from 'lucide-react';

const CompanySetup = () => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    tax_id: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Database එකට යන data payload එක හදාගැනීම
      const payload = {
        name: formData.name,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        tax_id: formData.tax_id || null
      };

      // 2. සමාගම Insert කරලා අලුතින් හැදුණු ID එක (newCompany.id) ලබා ගැනීම
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([payload])
        .select()
        .single();

      if (companyError) throw companyError;

      // 3. දැනට ලොග් වෙලා ඉන්න User ගේ තොරතුරු ලබා ගැනීම
      const { data: { user } } = await supabase.auth.getUser();

      if (user && newCompany) {
        // 4. User ගේ Profile එකේ 'company_id' එක Update කිරීම
        // මේකෙන් තමයි මේ User ව මේ සමාගමට අයිති කෙනෙක් කරන්නේ
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ company_id: newCompany.id })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      alert("Company successfully registered and linked to your account!");
      
      // Form එක Reset කිරීම
      setFormData({ name: '', address: '', phone: '', email: '', website: '', tax_id: '' });
      
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 flex justify-center bg-gray-50 min-h-screen">
      <Card className="max-w-2xl w-full shadow-xl bg-white rounded-2xl border border-gray-100 p-2">
        <CardHeader className="border-b border-gray-50 pb-4">
          <CardTitle className="text-2xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-2">
            <Building2 className="text-blue-600" />
            Company <span className="text-blue-600">Setup</span>
          </CardTitle>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1 italic">Register business profile (Optional fields can be left blank)</p>
        </CardHeader>
        
        <CardContent className="mt-6">
          <form onSubmit={handleCreateCompany} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                <Building2 size={12} className="text-blue-500" /> Company Name *
              </label>
              <input 
                name="name"
                type="text" 
                value={formData.name}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700" 
                placeholder="Business Name"
                required 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-black uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                <MapPin size={12} /> Address
              </label>
              <input 
                name="address"
                type="text" 
                value={formData.address}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700" 
                placeholder="Street Address, City"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                <Phone size={12} /> Phone
              </label>
              <input 
                name="phone"
                type="text" 
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700" 
                placeholder="Contact Number"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                <Mail size={12} /> Email
              </label>
              <input 
                name="email"
                type="email" 
                value={formData.email}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700" 
                placeholder="info@business.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                <Globe size={12} /> Website
              </label>
              <input 
                name="website"
                type="text" 
                value={formData.website}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700" 
                placeholder="www.example.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1">
                <Hash size={12} /> Tax ID / BR
              </label>
              <input 
                name="tax_id"
                type="text" 
                value={formData.tax_id}
                onChange={handleChange}
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700" 
                placeholder="Registration Number"
              />
            </div>

            <div className="md:col-span-2 pt-4">
              <Button 
                type="submit" 
                variant="primary"
                loading={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl font-black uppercase shadow-lg shadow-blue-100 h-14"
              >
                Save Company Details
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySetup;