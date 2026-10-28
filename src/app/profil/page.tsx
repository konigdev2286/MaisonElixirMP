'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getProfileStats, updateProfileName } from '@/app/actions/profile';
import { formatFCFA, formatDate } from '@/lib/utils';
import { Profile } from '@/types/database.types';

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<{
    totalSalesCount: number;
    totalAmount: number;
    todaySalesCount: number;
    todayAmount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Formulaire Nom
  const [fullName, setFullName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');

  // Formulaire Mot de passe
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProfileStats();
      if (data?.profile) {
        setProfile(data.profile as Profile);
        setFullName(data.profile.full_name);
        setStats(data.stats);
      }
    } catch (err: unknown) {
      console.error('Erreur chargement profil:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    setNameSuccess('');

    if (!fullName.trim() || fullName.trim().length < 2) {
      setNameError('Le nom doit comporter au moins 2 caractères.');
      return;
    }

    setNameLoading(true);
    const res = await updateProfileName(fullName);
    setNameLoading(false);

    if (res.success) {
      setNameSuccess('Nom modifié avec succès !');
      router.refresh();
      setTimeout(() => setNameSuccess(''), 4000);
    } else {
      setNameError(res.error || 'Erreur lors de la mise à jour.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setPasswordLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setPasswordLoading(false);

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess('Mot de passe mis à jour avec succès !');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/connexion');
    router.refresh();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-sm text-fg-muted font-medium">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-danger font-semibold">Impossible de charger le profil.</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-accent text-white rounded-xl text-sm font-semibold"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const isPatronne = profile.role === 'patronne';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* HEADER DE LA PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
            Mon Profil
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Gérez vos informations de compte, vos performances et la sécurité de votre accès.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs font-bold hover:bg-danger/20 transition-all shadow-sm w-fit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Se déconnecter
        </button>
      </div>

      {/* CARTE D'IDENTITÉ PRINCIPALE */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar géant */}
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white font-black text-2xl shadow-lg ring-4 ring-card">
            {getInitials(profile.full_name)}
            <span
              className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-card"
              title="Session active"
            />
          </div>

          {/* Informations détaillées */}
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-fg leading-tight">
                {profile.full_name}
              </h2>
              {/* Badge Rôle */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isPatronne
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                }`}
              >
                {isPatronne ? '👑 Patronne (Administrateur)' : '🛍️ Vendeur / Vendeuse'}
              </span>
              {/* Badge Statut */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Compte Actif
              </span>
            </div>

            <p className="text-sm text-fg-muted font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {profile.email}
            </p>

            <p className="text-xs text-fg-muted flex items-center gap-2 pt-1">
              <svg className="w-3.5 h-3.5 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Membre depuis le {formatDate(profile.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* STATISTIQUES PERSONNELLES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-fg-muted uppercase tracking-wider">
              Total Ventes Réalisées
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-accent">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-fg">
            {stats?.totalSalesCount || 0}
          </div>
          <p className="text-xs text-fg-muted mt-1">Ventes validées à votre nom</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-fg-muted uppercase tracking-wider">
              Chiffre d&apos;Affaires Généré
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatFCFA(stats?.totalAmount || 0)}
          </div>
          <p className="text-xs text-fg-muted mt-1">Recettes totales enregistrées</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-fg-muted uppercase tracking-wider">
              Aujourd&apos;hui
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-fg">
            {stats?.todaySalesCount || 0}{' '}
            <span className="text-xs font-semibold text-fg-muted">
              ({formatFCFA(stats?.todayAmount || 0)})
            </span>
          </div>
          <p className="text-xs text-fg-muted mt-1">Activité de la journée</p>
        </div>
      </div>

      {/* FORMULAIRES DE GESTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FORMULAIRE 1 : INFORMATIONS DU COMPTE */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-fg">Informations personnelles</h3>
              <p className="text-xs text-fg-muted">Modifiez votre nom affiché sur les reçus</p>
            </div>
          </div>

          <form onSubmit={handleUpdateName} className="mt-5 space-y-4">
            {nameSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                ✓ {nameSuccess}
              </div>
            )}
            {nameError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-semibold">
                ⚠ {nameError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-fg mb-1.5">
                Nom complet
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-bg text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Ex: Claudine Ndolo"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1.5">
                Adresse email
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-bg-subtle text-sm text-fg-muted cursor-not-allowed opacity-80"
              />
              <p className="text-[11px] text-fg-muted mt-1">
                L&apos;adresse email sert d&apos;identifiant de connexion et ne peut être modifiée.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1.5">
                Rôle attribué
              </label>
              <input
                type="text"
                value={isPatronne ? 'Patronne (Accès complet)' : 'Vendeur / Vendeuse (Caisse & Stock)'}
                disabled
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-bg-subtle text-sm text-fg-muted cursor-not-allowed opacity-80"
              />
            </div>

            <button
              type="submit"
              disabled={nameLoading}
              className="w-full h-11 rounded-xl bg-accent text-white font-bold text-xs shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
            >
              {nameLoading ? 'Enregistrement...' : 'Enregistrer le nom'}
            </button>
          </form>
        </div>

        {/* FORMULAIRE 2 : SÉCURITÉ & MOT DE PASSE */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-fg">Sécurité du compte</h3>
              <p className="text-xs text-fg-muted">Mettre à jour votre mot de passe</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="mt-5 space-y-4">
            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                ✓ {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-semibold">
                ⚠ {passwordError}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-fg">
                  Nouveau mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-accent hover:underline font-semibold"
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-bg text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Au moins 6 caractères"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-11 px-3.5 rounded-xl border border-border bg-bg text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Retapez le mot de passe"
              />
            </div>

            <div className="p-3 rounded-xl bg-bg-subtle border border-border text-[11px] text-fg-muted space-y-1">
              <div className="font-semibold text-fg">Conseil de sécurité :</div>
              <div>Utilisez un mot de passe facile à retenir pour vous mais difficile à deviner par autrui.</div>
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full h-11 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-sm hover:bg-amber-700 transition-colors disabled:opacity-50 mt-2"
            >
              {passwordLoading ? 'Mise à jour...' : 'Changer le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

