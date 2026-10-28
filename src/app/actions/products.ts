'use server';

import { createClient } from '@/lib/supabase/server';
import { Product } from '@/types/database.types';
import { revalidatePath } from 'next/cache';

async function getServerUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) throw new Error('Compte inactif.');
  return { user, profile, supabase };
}

async function requirePatronne() {
  const ctx = await getServerUser();
  if (ctx.profile.role !== 'patronne') {
    throw new Error('Action réservée à la patronne.');
  }
  return ctx;
}

export async function getProducts(): Promise<Product[]> {
  await getServerUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Product[]) || [];
}

export async function createProduct(formData: {
  name: string;
  category: string;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
  alert_threshold: number;
}) {
  await requirePatronne();
  const supabase = await createClient();

  if (!formData.name?.trim()) {
    return { success: false, error: 'Le nom du produit est obligatoire.' };
  }
  if (formData.selling_price < 0 || formData.cost_price < 0) {
    return { success: false, error: 'Les prix ne peuvent pas être négatifs.' };
  }

  const { error } = await supabase.from('products').insert({
    name: formData.name.trim(),
    category: formData.category.trim(),
    selling_price: Math.round(formData.selling_price),
    cost_price: Math.round(formData.cost_price),
    stock_quantity: Math.round(formData.stock_quantity),
    alert_threshold: Math.round(formData.alert_threshold),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/produits');
  revalidatePath('/stock-bas');
  revalidatePath('/vente');
  return { success: true };
}

export async function updateProduct(
  productId: string,
  formData: {
    name: string;
    category: string;
    selling_price: number;
    cost_price: number;
    stock_quantity: number;
    alert_threshold: number;
  }
) {
  await requirePatronne();
  const supabase = await createClient();

  const { error } = await supabase
    .from('products')
    .update({
      name: formData.name.trim(),
      category: formData.category.trim(),
      selling_price: Math.round(formData.selling_price),
      cost_price: Math.round(formData.cost_price),
      stock_quantity: Math.round(formData.stock_quantity),
      alert_threshold: Math.round(formData.alert_threshold),
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/produits');
  revalidatePath('/stock-bas');
  revalidatePath('/vente');
  return { success: true };
}

export async function deleteProduct(productId: string) {
  await requirePatronne();
  const supabase = await createClient();

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    if (error.message.includes('foreign key')) {
      return {
        success: false,
        error: 'Ce produit est lié à des ventes. Supprimez d\'abord les ventes associées.',
      };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/produits');
  revalidatePath('/stock-bas');
  revalidatePath('/vente');
  return { success: true };
}

export async function restockProduct(productId: string, quantity: number) {
  const { user } = await requirePatronne();
  const supabase = await createClient();

  if (quantity <= 0) {
    return { success: false, error: 'La quantité doit être supérieure à zéro.' };
  }

  const { data, error } = await supabase.rpc('restock_product', {
    p_product_id: productId,
    p_additional_quantity: Math.round(quantity),
    p_user_id: user.id,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/produits');
  revalidatePath('/stock-bas');
  return { success: true, newStock: data?.new_stock };
}
