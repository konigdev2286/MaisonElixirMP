'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getProfileStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Non authentifié');
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) {
    throw new Error('Profil introuvable');
  }

  // Statistiques de ventes de l'utilisateur connecté
  const { data: sales, count: totalSalesCount } = await supabase
    .from('sales')
    .select('id, total_amount, created_at, status', { count: 'exact' })
    .eq('seller_id', user.id)
    .eq('status', 'validee');

  const totalAmount = sales?.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0) || 0;

  // Ventes du jour (date locale format YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales?.filter((s) => s.created_at.startsWith(todayStr)) || [];
  const todayAmount = todaySales.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);

  return {
    profile,
    stats: {
      totalSalesCount: totalSalesCount || 0,
      totalAmount,
      todaySalesCount: todaySales.length,
      todayAmount,
    },
  };
}

export async function updateProfileName(fullName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Vous devez être connecté pour modifier votre profil.' };
  }

  const cleanName = fullName.trim();
  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Le nom complet doit comporter au moins 2 caractères.' };
  }

  try {
    const adminClient = createAdminClient();

    // 1. Mise à jour de la table profiles
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name: cleanName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // 2. Mise à jour des metadata de l'utilisateur Auth
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { full_name: cleanName },
    });

    revalidatePath('/', 'layout');
    revalidatePath('/profil');

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: msg };
  }
}

