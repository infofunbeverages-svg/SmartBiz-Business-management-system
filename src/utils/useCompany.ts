import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export const useCompany = () => {
  const [company, setCompany] = useState<{ id: string, name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCompanyDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 1. User profile එකෙන් company_id එක ගන්නවා
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

          if (profile?.company_id) {
            // 2. ඒ ID එකෙන් සමාගමේ නම විතරක් ගන්නවා (tax_id ඉල්ලන්නේ නැති නිසා error එන්නේ නැහැ)
            const { data: comp } = await supabase
              .from('companies')
              .select('id, name') 
              .eq('id', profile.company_id)
              .single();

            if (comp) setCompany(comp);
          }
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    getCompanyDetails();
  }, []);

  return { company, loading };
};