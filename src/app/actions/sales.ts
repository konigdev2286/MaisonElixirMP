'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createSale(items: { product_id: string; quantity: number }[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Non authentifié.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) {
    return { success: false, error: 'Ce compte est désactivé.' };
  }

  if (!items || items.length === 0) {
    return { success: false, error: 'Le panier est vide.' };
  }

  const { data, error } = await supabase.rpc('create_sale', {
    p_seller_id: user.id,
    p_items: items,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/vente');
  revalidatePath('/historique');
  revalidatePath('/produits');
  revalidatePath('/stock-bas');
  revalidatePath('/rapports');

  return { success: true, saleId: data?.sale_id, totalAmount: data?.total_amount };
}

export async function cancelSale(saleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Non authentifié.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'patronne') {
    return { success: false, error: 'Seule la patronne peut annuler une vente.' };
  }

  const { data, error } = await supabase.rpc('cancel_sale', {
    p_sale_id: saleId,
    p_user_id: user.id,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/historique');
  revalidatePath('/rapports');
  revalidatePath('/produits');
  revalidatePath('/stock-bas');

  return { success: true, message: data?.message };
}

export async function getSales(filters?: {
  date?: string;
  seller_id?: string;
  limit?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  let query = supabase
    .from('sales')
    .select(`
      *,
      seller:profiles!sales_seller_id_fkey(id, full_name, email),
      items:sale_items(
        id, product_id, quantity, unit_price, total_price, unit_cost_price,
        product:products(name, category)
      )
    `)
    .order('created_at', { ascending: false });

  // Les vendeurs ne voient que leurs propres ventes
  if (profile?.role !== 'patronne') {
    query = query.eq('seller_id', user.id);
  }

  if (filters?.seller_id) {
    query = query.eq('seller_id', filters.seller_id);
  }

  if (filters?.date) {
    const startOfDay = `${filters.date}T00:00:00.000Z`;
    const endOfDay = `${filters.date}T23:59:59.999Z`;
    query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data || [];
}
