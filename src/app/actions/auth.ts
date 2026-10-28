'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function registerPatronne(formData: {
  email: string;
  fullName: string;
  password: string;
}) {
  const adminClient = createAdminClient();
  const cleanEmail = formData.email.trim().toLowerCase();
  const cleanName = formData.fullName.trim();

  if (!cleanEmail || !cleanName || !formData.password) {
    return { success: false, error: 'Tous les champs sont obligatoires.' };
  }

  if (formData.password.length < 6) {
    return { success: false, error: 'Le mot de passe doit comporter au moins 6 caractères.' };
  }

  try {
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        role: 'patronne',
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return { success: false, error: 'Un compte avec cette adresse email existe déjà. Veuillez vous connecter.' };
      }
      return { success: false, error: authError.message };
    }

    if (!authUser.user) {
      return { success: false, error: 'Impossible de créer le compte utilisateur.' };
    }

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: authUser.user.id,
      email: cleanEmail,
      full_name: cleanName,
      role: 'patronne',
      is_active: true,
    });

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur inattendue.';
    return { success: false, error: msg };
  }
}

