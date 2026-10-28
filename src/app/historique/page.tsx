'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sale, Profile } from '@/types/database.types';
import { formatFCFA, formatDate, formatTime } from '@/lib/utils';
import { cancelSale } from '@/app/actions/sales';

export default function HistoriquePage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [sellers, setSellers] = useState<Profile[]>([]);
  const [userRole, setUserRole] = useState<'patronne' | 'vendeur'>('vendeur');
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'validee' | 'annulee'>('all');
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profileData?.role as 'patronne' | 'vendeur') || 'vendeur';
    setUserRole(role);

    if (role === 'patronne') {
      const { data: sellersData } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, created_at, updated_at')
        .eq('role', 'vendeur')
        .order('full_name');
      setSellers((sellersData as Profile[]) || []);
    }

    await loadSales(supabase, user.id, role, dateFilter, sellerFilter);
    setLoading(false);
  }, [dateFilter, sellerFilter]);

  const loadSales = async (
    supabase: ReturnType<typeof createClient>,
    uid: string,
    role: string,
    date: string,
    seller: string
  ) => {
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
      .order('created_at', { ascending: false })
      .limit(100);

    if (role !== 'patronne') {
      query = query.eq('seller_id', uid);
    } else if (seller) {
      query = query.eq('seller_id', seller);
    }

    if (date) {
      query = query
        .gte('created_at', `${date}T00:00:00.000Z`)
        .lte('created_at', `${date}T23:59:59.999Z`);
    }

    const { data } = await query;
    setSales((data as Sale[]) || []);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelSale = async (saleId: string) => {
    if (!confirm('Êtes-vous sûre de vouloir annuler cette vente ? Le stock sera automatiquement réintégré.')) {
      return;
    }
    setCancellingId(saleId);
    setError('');

    const result = await cancelSale(saleId);
    if (!result.success) {
      setError(result.error || "Erreur lors de l'annulation.");
    } else {
      await loadData();
    }
    setCancellingId(null);
  };

  const filteredSales = sales.filter((s) => {
    if (statusFilter === 'all') return true;
    return s.status === statusFilter;
  });

  const totalValidated = sales
    .filter((s) => s.status === 'validee')
    .reduce((sum, s) => sum + s.total_amount, 0);

  const totalCount = sales.length;
  const validatedCount = sales.filter((s) => s.status === 'validee').length;
  const cancelledCount = sales.filter((s) => s.status === 'annulee').length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-xs font-semibold text-fg-muted">Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. HEADER (Style SilverLogix) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Historique des Ventes</h1>
          <p className="text-xs md:text-sm text-fg-muted mt-0.5">
            Journal complet des transactions, tickets de caisse et audit des annulations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent hover:bg-accent-hover text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exporter le Journal
          </button>
        </div>
      </div>

      {/* 2. LES 4 KPI STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Transactions</p>
              <p className="text-xl font-black text-fg">{totalCount}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-fg-muted">Transactions réelles</span>
            <span className="font-bold text-emerald-600">{validatedCount} validées</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Total Encaissé</p>
              <p className="text-lg lg:text-xl font-black text-fg truncate">
                {formatFCFA(totalValidated)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-fg-muted">Caisse</span>
            <span className="font-bold text-emerald-600">Encaissé net</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Ventes Annulées</p>
              <p className="text-xl font-black text-rose-600">{cancelledCount}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-fg-muted">Annulations</span>
            <span className="font-bold text-rose-600">{cancelledCount} au total</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Vendeurs</p>
              <p className="text-xl font-black text-fg">{sellers.length}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-fg-muted">Comptes vendeurs</span>
            <span className="font-bold text-purple-600">{sellers.length} enregistrés</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-4 text-xs font-semibold text-danger shadow-sm">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* 3. TABLE DES VENTES (Style SilverLogix "Recent Deliveries") */}
      <div className="rounded-2xl border border-border bg-card shadow-chic overflow-hidden">
        {/* En-tête du tableau avec titre et filtres */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold text-sm">
              📋
            </span>
            <h2 className="font-black text-base text-fg">Journal des Ventes Récentes</h2>
          </div>

          {/* Filtres interactifs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtre Date */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
            />

            {/* Filtre Vendeur (patronne) */}
            {userRole === 'patronne' && sellers.length > 0 && (
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="h-9 rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
              >
                <option value="">Tous les vendeurs</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            )}

            {/* Filtre Statut */}
            <div className="flex rounded-xl border border-border bg-bg p-0.5">
              {(['all', 'validee', 'annulee'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                    statusFilter === st
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {st === 'all' ? 'Toutes' : st === 'validee' ? 'Validées' : 'Annulées'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tableau Responsive Chic */}
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-fg">Aucune transaction trouvée</p>
            <p className="text-xs text-fg-muted mt-1">
              Modifiez vos filtres ou effectuez une nouvelle vente au comptoir.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-blue-50/50 dark:bg-slate-800/40 text-fg-muted font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">N° Ticket</th>
                  <th className="py-3.5 px-4">Vendeur / Caissier</th>
                  <th className="py-3.5 px-4">Articles</th>
                  <th className="py-3.5 px-4">Total Net</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Date & Heure</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSales.map((sale) => {
                  const isCancelled = sale.status === 'annulee';
                  const isExpanded = expandedSale === sale.id;
                  const shortId = `VTE-${sale.id.slice(0, 5).toUpperCase()}`;
                  const sellerName =
                    ((sale.seller as unknown) as { full_name?: string })?.full_name ||
                    'Vendeur inconnu';

                  return (
                    <React.Fragment key={sale.id}>
                      <tr className="hover:bg-bg-subtle/60 transition-colors">
                        {/* ID Vente */}
                        <td className="py-3.5 px-4 font-mono font-bold text-accent">
                          {shortId}
                        </td>

                        {/* Nom du vendeur */}
                        <td className="py-3.5 px-4 font-semibold text-fg">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px]">
                              {sellerName[0]}
                            </span>
                            <span>{sellerName}</span>
                          </div>
                        </td>

                        {/* Résumé des articles */}
                        <td className="py-3.5 px-4 text-fg-muted">
                          {(sale.items || []).length} article(s)
                        </td>

                        {/* Total FCFA */}
                        <td className="py-3.5 px-4 font-mono font-bold text-sm text-fg">
                          <span className={isCancelled ? 'line-through opacity-50' : ''}>
                            {formatFCFA(sale.total_amount)}
                          </span>
                        </td>

                        {/* Statut Pill (Style SilverLogix avec puce colorée) */}
                        <td className="py-3.5 px-4">
                          {isCancelled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2.5 py-1 text-[11px] font-bold">
                              <span className="h-2 w-2 rounded-full bg-rose-500" />
                              ANNULÉE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-bold">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              PAYÉ
                            </span>
                          )}
                        </td>

                        {/* Date & Heure */}
                        <td className="py-3.5 px-4 text-fg-muted">
                          <span className="font-medium text-fg">{formatDate(sale.created_at)}</span>
                          <span className="block text-[11px] text-fg-muted">{formatTime(sale.created_at)}</span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                              className="rounded-lg border border-border bg-bg px-2.5 py-1 font-semibold text-[11px] text-fg hover:border-accent"
                            >
                              {isExpanded ? 'Fermer ▲' : 'Détails ▼'}
                            </button>

                            {userRole === 'patronne' && !isCancelled && (
                              <button
                                onClick={() => handleCancelSale(sale.id)}
                                disabled={cancellingId === sale.id}
                                className="rounded-lg border border-danger-border bg-danger-bg px-2.5 py-1 font-semibold text-[11px] text-danger hover:bg-red-100 disabled:opacity-40"
                              >
                                {cancellingId === sale.id ? '...' : 'Annuler'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Ligne dépliable : Détail des articles de la vente */}
                      {isExpanded && (
                        <tr className="bg-bg-subtle/80">
                          <td colSpan={7} className="p-4">
                            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                              <h4 className="font-bold text-xs text-fg uppercase tracking-wider">
                                Détail des articles (Ticket {shortId}) :
                              </h4>
                              <div className="divide-y divide-border">
                                {(sale.items || []).map((it: any) => (
                                  <div key={it.id} className="py-2 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-fg">
                                      {it.product?.name || 'Produit'} (x{it.quantity})
                                    </span>
                                    <span className="font-mono text-fg-muted">
                                      {formatFCFA(it.unit_price)} / u ={' '}
                                      <strong className="text-fg">{formatFCFA(it.total_price)}</strong>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination (Style SilverLogix) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-bg-subtle/40 text-xs text-fg-muted">
          <div>
            Affichage de <strong>1</strong> à <strong>{filteredSales.length}</strong> sur <strong>{totalCount}</strong> transactions
          </div>
          <div className="flex items-center gap-1.5">
            <button className="h-8 px-2.5 rounded-lg border border-border bg-card hover:bg-bg-subtle disabled:opacity-40 font-bold">
              ‹
            </button>
            <button className="h-8 w-8 rounded-lg bg-accent text-white font-bold">
              1
            </button>
            <button className="h-8 px-2.5 rounded-lg border border-border bg-card hover:bg-bg-subtle disabled:opacity-40 font-bold">
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
