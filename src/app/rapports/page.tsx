'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatFCFA, toInputDateFormat } from '@/lib/utils';

interface SellerStats {
  seller_id: string;
  seller_name: string;
  sales_count: number;
  total_revenue: number;
}

interface ProductStats {
  product_id: string;
  product_name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
}

interface DayStats {
  total_sales_amount: number;
  sales_count: number;
  estimated_profit: number;
  seller_rankings: SellerStats[];
  top_products: ProductStats[];
}

export default function RapportsPage() {
  const [date, setDate] = useState(toInputDateFormat());
  const [stats, setStats] = useState<DayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'patronne') {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setAuthorized(true);

    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { data: salesData } = await supabase
      .from('sales')
      .select(`
        id, total_amount, status, seller_id,
        seller:profiles!sales_seller_id_fkey(id, full_name),
        items:sale_items(quantity, unit_price, total_price, unit_cost_price)
      `)
      .eq('status', 'validee')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    const sales = salesData || [];

    const total_sales_amount = sales.reduce(
      (sum: number, s: any) => sum + (s.total_amount || 0),
      0
    );
    const estimated_profit = sales.reduce((sum: number, s: any) => {
      const saleProfit = (s.items || []).reduce((ps: number, item: any) => {
        return ps + item.total_price - item.unit_cost_price * item.quantity;
      }, 0);
      return sum + saleProfit;
    }, 0);

    const sellerMap: Record<string, SellerStats> = {};
    for (const s of sales as any[]) {
      const sid = s.seller_id;
      if (!sellerMap[sid]) {
        sellerMap[sid] = {
          seller_id: sid,
          seller_name: s.seller?.full_name || 'Vendeur inconnu',
          sales_count: 0,
          total_revenue: 0,
        };
      }
      sellerMap[sid].sales_count += 1;
      sellerMap[sid].total_revenue += s.total_amount || 0;
    }
    const seller_rankings = Object.values(sellerMap).sort(
      (a, b) => b.total_revenue - a.total_revenue
    );

    const { data: itemsData } = await supabase
      .from('sale_items')
      .select(`
        quantity, total_price,
        product:products(id, name, category),
        sale:sales!inner(status, created_at)
      `)
      .eq('sale.status', 'validee')
      .gte('sale.created_at', startOfDay)
      .lte('sale.created_at', endOfDay);

    const productMap: Record<string, ProductStats> = {};
    for (const item of (itemsData as any[]) || []) {
      const pid = item.product?.id;
      if (!pid) continue;
      if (!productMap[pid]) {
        productMap[pid] = {
          product_id: pid,
          product_name: item.product?.name || '',
          category: item.product?.category || '',
          total_quantity: 0,
          total_revenue: 0,
        };
      }
      productMap[pid].total_quantity += item.quantity;
      productMap[pid].total_revenue += item.total_price;
    }
    const top_products = Object.values(productMap)
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 10);

    setStats({
      total_sales_amount,
      sales_count: sales.length,
      estimated_profit,
      seller_rankings,
      top_products,
    });
    setLoading(false);
  }, [date]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (!authorized && !loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 text-xl mb-2">
            🔒
          </div>
          <h2 className="text-base font-bold text-fg">Accès Restreint</h2>
          <p className="text-xs text-fg-muted mt-1">
            Les rapports financiers et les marges bénéficiaires sont réservés à la patronne.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. HEADER (Style SilverLogix) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Rapports & Rentabilité</h1>
          <p className="text-xs md:text-sm text-fg-muted mt-0.5">
            Analyse des encaissements, marges bénéficiaires et performances d'équipe.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 shadow-sm">
            <span className="text-xs font-bold text-fg-muted">Date :</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={toInputDateFormat()}
              className="bg-transparent text-xs font-bold text-fg focus:outline-none"
            />
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-accent hover:bg-accent-hover text-white px-3.5 py-2 text-xs font-bold shadow-sm transition-all"
          >
            Imprimer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            <p className="text-xs font-semibold text-fg-muted">Calcul des indicateurs financiers...</p>
          </div>
        </div>
      ) : !stats ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-xs text-fg-muted">
          Aucune donnée disponible pour cette date.
        </div>
      ) : (
        <>
          {/* 2. LES 4 KPI STAT CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-fg-muted">Chiffre d'Affaires</p>
                  <p className="text-lg lg:text-xl font-black text-fg truncate">
                    {formatFCFA(stats.total_sales_amount)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
                <span className="font-semibold text-fg-muted">Recettes brutes</span>
                <span className="font-bold text-blue-600">Encaissé net</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-fg-muted">Bénéfice Net Estimé</p>
                  <p className="text-lg lg:text-xl font-black text-emerald-600 truncate">
                    {formatFCFA(stats.estimated_profit)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
                <span className="font-semibold text-fg-muted">Rentabilité</span>
                <span className="font-bold text-emerald-600">
                  {stats.total_sales_amount > 0
                    ? `${Math.round((stats.estimated_profit / stats.total_sales_amount) * 100)}% de marge`
                    : '0% marge'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-fg-muted">Volume de Ventes</p>
                  <p className="text-xl font-black text-fg">{stats.sales_count}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
                <span className="font-semibold text-fg-muted">Commandes</span>
                <span className="font-bold text-purple-600">{stats.sales_count} ticket(s)</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-fg-muted">Caissiers Actifs</p>
                  <p className="text-xl font-black text-fg">{stats.seller_rankings.length}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
                <span className="font-semibold text-fg-muted">Équipe en caisse</span>
                <span className="font-bold text-amber-600">{stats.seller_rankings.length} actif(s)</span>
              </div>
            </div>
          </div>

          {/* 3. DEUX TABLES CHIC CÔTE À CÔTE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Classement Vendeurs */}
            <div className="rounded-2xl border border-border bg-card shadow-chic overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 font-bold text-xs">
                    🏆
                  </span>
                  <h2 className="font-bold text-sm text-fg">Performance des Vendeurs</h2>
                </div>
                <span className="text-[11px] text-fg-muted font-semibold">
                  {stats.seller_rankings.length} collaborateur(s)
                </span>
              </div>

              {stats.seller_rankings.length === 0 ? (
                <div className="p-8 text-center text-xs text-fg-muted">
                  Aucune vente enregistrée ce jour.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-blue-50/50 dark:bg-slate-800/40 text-fg-muted font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Rang</th>
                        <th className="py-3 px-4">Vendeur</th>
                        <th className="py-3 px-4 text-center">Transactions</th>
                        <th className="py-3 px-4 text-right">Recette Générée</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stats.seller_rankings.map((s, idx) => (
                        <tr key={s.seller_id} className="hover:bg-bg-subtle/60 transition-colors">
                          <td className="py-3 px-4 font-black text-accent">
                            #{idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-fg">
                            {s.seller_name}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-fg-muted">
                            {s.sales_count}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-fg">
                            {formatFCFA(s.total_revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top 10 Produits */}
            <div className="rounded-2xl border border-border bg-card shadow-chic overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs">
                    ⭐
                  </span>
                  <h2 className="font-bold text-sm text-fg">Top 10 Produits les Plus Vendus</h2>
                </div>
                <span className="text-[11px] text-fg-muted font-semibold">
                  Par volume écoulé
                </span>
              </div>

              {stats.top_products.length === 0 ? (
                <div className="p-8 text-center text-xs text-fg-muted">
                  Aucun article vendu ce jour.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-blue-50/50 dark:bg-slate-800/40 text-fg-muted font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Article</th>
                        <th className="py-3 px-4">Catégorie</th>
                        <th className="py-3 px-4 text-center">Volume</th>
                        <th className="py-3 px-4 text-right">Total (FCFA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stats.top_products.map((p) => (
                        <tr key={p.product_id} className="hover:bg-bg-subtle/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-fg">
                            {p.product_name}
                          </td>
                          <td className="py-3 px-4">
                            <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold">
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-black text-accent">
                            {p.total_quantity}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-fg">
                            {formatFCFA(p.total_revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
