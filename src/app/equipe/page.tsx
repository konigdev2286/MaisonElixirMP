'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Profile, UserRole } from '@/types/database.types';
import { formatDate } from '@/lib/utils';
import { createTeamMember, toggleMemberStatus, deleteTeamMember } from '@/app/actions/team';
import { createClient } from '@/lib/supabase/client';

function AddMemberModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'vendeur' as UserRole,
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await createTeamMember({
      email: form.email,
      fullName: form.full_name,
      role: form.role,
      password: form.password,
    });

    if (!result.success) {
      setError(result.error || 'Erreur lors de la création du compte.');
      setLoading(false);
      return;
    }

    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold">
              👥
            </div>
            <h2 className="text-base font-black text-fg">Ajouter un Collaborateur</h2>
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl border border-danger-border bg-danger-bg p-3 text-xs font-semibold text-danger">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-fg">Nom complet</label>
            <input
              required
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="ex: Patrick Moukoko"
              className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-fg">Adresse email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nom@exemple.com"
              className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-fg">Rôle attribué</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
            >
              <option value="vendeur">Vendeur (caisse & stocks uniquement)</option>
              <option value="patronne">Patronne (accès complet & finances)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-fg">Mot de passe temporaire</label>
            <input
              required
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Au moins 6 caractères"
              className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
            />
          </div>

          <div className="mt-6 flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-border bg-bg text-xs font-bold text-fg hover:bg-bg-subtle"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-accent text-white text-xs font-black shadow-md shadow-blue-500/20 hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer le Compte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EquipePage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    setMembers((data as Profile[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (member: Profile) => {
    setTogglingId(member.id);
    setActionError('');
    const result = await toggleMemberStatus(member.id, !member.is_active);
    if (!result.success) {
      setActionError(result.error || 'Erreur lors du changement de statut.');
    } else {
      await loadData();
    }
    setTogglingId(null);
  };

  const handleDelete = async (member: Profile) => {
    if (!confirm(`Supprimer définitivement le compte de ${member.full_name} ?`)) {
      return;
    }
    setDeletingId(member.id);
    setActionError('');
    const result = await deleteTeamMember(member.id);
    if (!result.success) {
      setActionError(result.error || 'Erreur lors de la suppression.');
    } else {
      await loadData();
    }
    setDeletingId(null);
  };

  const activeMembersCount = members.filter((m) => m.is_active).length;
  const sellersCount = members.filter((m) => m.role === 'vendeur').length;
  const patronnesCount = members.filter((m) => m.role === 'patronne').length;
  const disabledMembersCount = members.filter((m) => !m.is_active).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-xs font-semibold text-fg-muted">Chargement de l'équipe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. HEADER (Style SilverLogix) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Gestion de l'Équipe</h1>
          <p className="text-xs md:text-sm text-fg-muted mt-0.5">
            Administration des comptes collaborateurs, attribution des rôles et contrôle d'accès.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 text-xs font-black shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all"
          >
            <span>+ Nouveau Collaborateur</span>
          </button>
        </div>
      </div>

      {/* 2. STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Effectif Total</p>
              <p className="text-xl font-black text-fg">{members.length}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-blue-600">✓ {activeMembersCount} actifs</span>
            <span className="font-bold text-fg-muted">Effectif</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Vendeurs</p>
              <p className="text-xl font-black text-fg">{sellersCount}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-emerald-600">Accès Caisse & Stock</span>
            <span className="font-bold text-fg-muted">{sellersCount} en poste</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Direction</p>
              <p className="text-xl font-black text-fg">{patronnesCount}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-purple-600">Rôle Patronne</span>
            <span className="font-bold text-fg-muted">Accès total</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Désactivés</p>
              <p className="text-xl font-black text-amber-600">{disabledMembersCount}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-amber-600">Accès bloqué</span>
            <span className="font-bold text-fg-muted">{disabledMembersCount} inactif(s)</span>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-4 text-xs font-semibold text-danger shadow-sm">
          <span>⚠️</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* 3. TABLE DES COLLABORATEURS (Style SilverLogix) */}
      <div className="rounded-2xl border border-border bg-card shadow-chic overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold text-sm">
              👥
            </span>
            <h2 className="font-black text-base text-fg">Membres de l'Équipe</h2>
          </div>
          <span className="text-xs text-fg-muted font-medium">
            {members.length} utilisateur(s) enregistrés
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-blue-50/50 dark:bg-slate-800/40 text-fg-muted font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Collaborateur</th>
                <th className="py-3.5 px-4">Adresse Email</th>
                <th className="py-3.5 px-4">Rôle</th>
                <th className="py-3.5 px-4 text-center">Statut du Compte</th>
                <th className="py-3.5 px-4">Date de Création</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => {
                const isCurrent = member.id === currentUserId;

                return (
                  <tr key={member.id} className="hover:bg-bg-subtle/60 transition-colors">
                    {/* Nom & Avatar */}
                    <td className="py-3.5 px-4 font-bold text-fg">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs shadow-sm">
                          {member.full_name[0]}
                        </span>
                        <div>
                          <span>{member.full_name}</span>
                          {isCurrent && (
                            <span className="ml-2 rounded-md bg-accent/10 text-accent px-1.5 py-0.5 text-[10px] font-bold">
                              Vous
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-fg-muted font-mono">
                      {member.email}
                    </td>

                    {/* Rôle */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-bold ${
                          member.role === 'patronne'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {member.role === 'patronne' ? 'Patronne' : 'Vendeur'}
                      </span>
                    </td>

                    {/* Statut Pill */}
                    <td className="py-3.5 px-4 text-center">
                      {member.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-bold">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          ACTIF
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2.5 py-1 text-[11px] font-bold">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          DÉSACTIVÉ
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-fg-muted">
                      {formatDate(member.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {!isCurrent && (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleToggle(member)}
                            disabled={togglingId === member.id}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                              member.is_active
                                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                            } disabled:opacity-40`}
                          >
                            {togglingId === member.id
                              ? '...'
                              : member.is_active
                              ? 'Désactiver'
                              : 'Activer'}
                          </button>
                          <button
                            onClick={() => handleDelete(member)}
                            disabled={deletingId === member.id}
                            className="rounded-lg border border-danger-border bg-danger-bg px-2.5 py-1 text-[11px] font-bold text-danger hover:bg-red-100 disabled:opacity-40"
                          >
                            {deletingId === member.id ? '...' : 'Supprimer'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
