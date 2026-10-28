'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Profile, UserRole } from '@/types/database.types';
import { revalidatePath } from 'next/cache';

// Vérifie que l'utilisateur connecté est bien la patronne
async function verifyPatronne() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Non authentifié.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'patronne') {
    throw new Error('Action réservée exclusivement à la patronne.');
  }

  return user;
}

export async function getTeamMembers(): Promise<Profile[]> {
  await verifyPatronne();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Erreur lors du chargement de l'équipe : ${error.message}`);
  }

  return (data as Profile[]) || [];
}

export async function createTeamMember(formData: {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
}) {
  await verifyPatronne();
  const adminClient = createAdminClient();

  const cleanEmail = formData.email.trim().toLowerCase();
  const cleanName = formData.fullName.trim();

  if (!cleanEmail || !cleanName || !formData.password) {
    return { success: false, error: 'Tous les champs sont obligatoires.' };
  }

  if (formData.password.length < 6) {
    return { success: false, error: 'Le mot de passe doit contenir au moins 6 caractères.' };
  }

  try {
    // 1. Création dans auth.users
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        role: formData.role,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return { success: false, error: 'Un compte avec cette adresse email existe déjà.' };
      }
      return { success: false, error: authError.message };
    }

    if (!authUser.user) {
      return { success: false, error: 'Impossible de créer le compte utilisateur.' };
    }

    // 2. Insertion dans public.profiles
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: authUser.user.id,
      email: cleanEmail,
      full_name: cleanName,
      role: formData.role,
      is_active: true,
    });

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    revalidatePath('/equipe');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: message };
  }
}

export async function toggleMemberStatus(memberId: string, nextStatus: boolean) {
  const currentUser = await verifyPatronne();

  if (currentUser.id === memberId) {
    return { success: false, error: 'Vous ne pouvez pas désactiver votre propre compte patronne.' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/equipe');
  return { success: true };
}

export async function deleteTeamMember(memberId: string) {
  const currentUser = await verifyPatronne();

  if (currentUser.id === memberId) {
    return { success: false, error: 'Vous ne pouvez pas supprimer votre propre compte.' };
  }

  const adminClient = createAdminClient();

  // Supprime de auth.users (la suppression cascade sur public.profiles grâce à la clé étrangère ON DELETE CASCADE)
  const { error } = await adminClient.auth.admin.deleteUser(memberId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/equipe');
  return { success: true };
}
