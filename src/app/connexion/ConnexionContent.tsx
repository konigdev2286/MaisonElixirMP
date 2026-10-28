'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { registerPatronne } from '@/app/actions/auth';

export default function ConnexionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('erreur');

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState(
    errorParam === 'compte_desactive'
      ? 'Ce compte a été désactivé par la patronne. Accès refusé.'
      : ''
  );
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Veuillez renseigner votre adresse email et votre mot de passe.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg("Identifiants incorrects. Vérifiez l'adresse email et le mot de passe.");
        } else if (error.message.toLowerCase().includes('failed to fetch')) {
          setErrorMsg(
            "Connexion impossible au serveur Supabase. Vérifiez votre connexion internet ou vos identifiants dans .env.local."
          );
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', data.user.id)
          .single();

        if (profile && !profile.is_active) {
          await supabase.auth.signOut();
          setErrorMsg('Ce compte est désactivé. Contactez la patronne.');
          setLoading(false);
          return;
        }

        router.push('/vente');
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('failed to fetch')) {
        setErrorMsg(
          "Connexion impossible au serveur Supabase. Vérifiez votre connexion internet ou vos clés d'API."
        );
      } else {
        setErrorMsg('Une erreur inattendue est survenue. Réessayez.');
      }
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg('Veuillez renseigner tous les champs.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);

    const result = await registerPatronne({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
    });

    if (!result.success) {
      setErrorMsg(result.error || 'Erreur lors de la création du compte.');
      setLoading(false);
      return;
    }

    // Connexion automatique après inscription
    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setSuccessMsg('Compte patronne créé avec succès ! Vous pouvez maintenant vous connecter.');
      setMode('login');
      setLoading(false);
    } else {
      router.push('/vente');
      router.refresh();
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1e40af] via-[#1d4ed8] to-[#0f172a] p-4 sm:p-6 lg:p-8">
      {/* Bouton Thème flottant */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-card p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl shadow-lg shadow-blue-500/30 mb-3">
            BB
          </div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Boutique Brazza</h1>
          <p className="text-xs text-fg-muted mt-1">
            Gestion de caisse et de stocks • Congo-Brazzaville
          </p>
        </div>

        {/* Sélecteur de mode : Connexion / Création compte patronne */}
        <div className="mb-6 flex rounded-xl border border-border bg-bg p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              mode === 'login'
                ? 'bg-accent text-white shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Se Connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              mode === 'register'
                ? 'bg-accent text-white shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Créer Compte Patronne
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-3 text-xs font-semibold text-danger">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {mode === 'login' ? (
          /* FORMULAIRE DE CONNEXION RÉEL */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-fg">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre-email@domaine.com"
                required
                className="h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-fg">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-3.5 text-sm shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>
        ) : (
          /* FORMULAIRE DE CRÉATION DE COMPTE PATRONNE RÉEL */
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-fg">Nom complet de la patronne</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ex: Marie Louzolo"
                required
                className="h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-fg">Adresse email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marie@mon-commerce.cg"
                required
                className="h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-fg">Mot de passe</label>
              <input
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
                required
                className="h-11 w-full rounded-xl border border-border bg-bg px-3.5 text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-3.5 text-sm shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? 'Création du compte...' : 'Créer mon compte Patronne'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-border text-center">
          <p className="text-[11px] text-fg-muted">
            Les comptes vendeurs sont ensuite créés et gérés par la patronne depuis l'onglet <strong className="text-fg">Équipe</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
