import { supabase } from '../supabaseClient';

export const logActivity = async ({
  company_id,
  module,
  action,
  details,
}: {
  company_id: string;
  module: 'SALES' | 'INVENTORY' | 'FINANCE' | 'CUSTOMERS' | 'HRM' | 'ADMIN' | 'RM_GRN' | 'PRODUCTION';
  action: string;
  details?: Record<string, any>;
}) => {
  try {
    if (!company_id) return; // skip if company not loaded
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('activity_logs').insert([{
      company_id,
      user_id:    user?.id || null,
      module,
      action,
      details:    details || null,
    }]);
    if (error) console.warn('Activity log insert error:', error.message);
  } catch (e) {
    // Silent fail - don't break main flow
    console.warn('Activity log failed:', e);
  }
};