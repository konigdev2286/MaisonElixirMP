import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Variables d’environnement Supabase manquantes.');
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isAuthRoute = pathname === '/connexion';

    // Si non connecté et tente d'accéder à l'application
    if (!user && !isAuthRoute && !pathname.startsWith('/_next') && !pathname.includes('.')) {
      const url = request.nextUrl.clone();
      url.pathname = '/connexion';
      return NextResponse.redirect(url);
    }

    // Si connecté et tente d'accéder à la page de connexion
    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/vente';
      return NextResponse.redirect(url);
    }

    // Si connecté, vérifier le statut actif et le rôle pour les routes protégées
    if (user && !pathname.startsWith('/_next') && !pathname.includes('.')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      // Compte désactivé
      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = '/connexion';
        url.searchParams.set('erreur', 'compte_desactive');
        return NextResponse.redirect(url);
      }

      // Protection de la page Équipe : réservée à la patronne
      if (pathname.startsWith('/equipe') && profile?.role !== 'patronne') {
        const url = request.nextUrl.clone();
        url.pathname = '/vente';
        return NextResponse.redirect(url);
      }
    }
  } catch (error) {
    console.error('Erreur dans le middleware Supabase:', error);
    return supabaseResponse;
  }

  return supabaseResponse;
}
