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
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('activity_logs').insert([{
      company_id,
      user_id:    user?.id || null,
      module,
      action,
      details:    details || null,
    }]);
  } catch (e) {
    // Silent fail - don't break main flow
    console.warn('Activity log failed:', e);
  }
};