import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('role, permissions')
            .eq('id', user.id)
            .single();
          
          if (!error) {
            setRole(data?.role || null);
            setPermissions(data?.permissions || {});
          }
        }
      } catch (err) {
        console.error("Permission error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuth();
  }, []);

  const hasPermission = (permissionKey: string) => {
    // Super Admin ට හැම දෙයක්ම පේන්න ඕනේ
    if (role === 'super_admin') return true;
    // අදාළ key එක true ද කියලා බලනවා
    return permissions && permissions[permissionKey] === true;
  };

  return { hasPermission, role, loading };
};