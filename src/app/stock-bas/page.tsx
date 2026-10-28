'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Product } from '@/types/database.types';
import { formatFCFA } from '@/lib/utils';
import { restockProduct } from '@/app/actions/products';

function RestockModal({
  product,
  onClose,
  onSuccess,
}: {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(qty);
    if (!n || n <= 0) {
      setError('Entrez une quantité valide.');
      return;
    }
    setLoading(true);
    const result = await restockProduct(product.id, n);
    if (!result.success) {
      setError(result.error || 'Erreur lors du réapprovisionnement.');
      setLoading(false);
      return;
    }
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-sm font-black text-fg">Réapprovisionner</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-fg-muted">
            Article : <strong className="text-fg">{product.name}</strong><br />
            Stock actuel : <strong className="text-amber-600">{product.stock_quantity}</strong> (seuil d'alerte : {product.alert_threshold})
          </p>

          {error && (
            <div className="rounded-xl border border-danger-border bg-danger-bg p-3 text-xs font-semibold text-danger">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-fg">
              Quantité à ajouter au stock :
            </label>
            <input
              required
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="ex: 20"
              autoFocus
              className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-fg font-bold focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-border bg-bg text-xs font-bold text-fg hover:bg-bg-subtle"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-10 rounded-xl bg-accent text-white text-xs font-black shadow-md hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Mise à jour...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockBasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [userRole, setUserRole] = useState<'patronne' | 'vendeur'>('vendeur');
  const [loading, setLoading] = useState(true);
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    setUserRole((profile?.role as 'patronne' | 'vendeur') || 'vendeur');

    const { data } = await supabase
      .from('products')
      .select('*')
      .order('stock_quantity', { ascending: true });

    const all = (data as Product[]) || [];
    const lowStock = all.filter((p) => p.stock_quantity <= p.alert_threshold);
    setProducts(lowStock);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isPatronne = userRole === 'patronne';
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;
  const criticalStockCount = products.filter((p) => p.stock_quantity > 0).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-xs font-semibold text-fg-muted">Analyse des stocks critiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. HEADER (Style SilverLogix) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Alertes de Stock Bas</h1>
          <p className="text-xs md:text-sm text-fg-muted mt-0.5">
            Suivi des produits approchant de la rupture pour garantir la continuité des ventes.
          </p>
        </div>
        <div>
          <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-3.5 py-2 text-xs font-black shadow-sm">
            <span>⚠️</span>
            <span>{products.length} référence(s) à réapprovisionner</span>
          </span>
        </div>
      </div>

      {/* 2. STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Ruptures Totales</p>
              <p className="text-xl font-black text-rose-600">{outOfStockCount}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-rose-600">Stock = 0</span>
            <span className="font-bold text-rose-600">Urgent</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Sous le Seuil</p>
              <p className="text-xl font-black text-amber-600">{criticalStockCount}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-amber-600">Sous seuil d'alerte</span>
            <span className="font-bold text-amber-600">À surveiller</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Action Requise</p>
              <p className="text-xl font-black text-fg">{products.length}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-fg-muted">Total alertes</span>
            <span className="font-bold text-blue-600">{products.length} réf.</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <span className="font-black text-sm">FCFA</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Devise Locale</p>
              <p className="text-lg lg:text-xl font-black text-fg">Congo (BZV)</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-purple-600">Franc CFA</span>
            <span className="font-bold text-purple-600">Sans centimes</span>
          </div>
        </div>
      </div>

      {/* 3. TABLE DES STOCKS BAS (Style SilverLogix) */}
      <div className="rounded-2xl border border-border bg-card shadow-chic overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-bold text-sm">
              ⚠️
            </span>
            <h2 className="font-black text-base text-fg">Articles nécessitant un Réapprovisionnement</h2>
          </div>
          <span className="text-xs text-fg-muted font-medium">
            Trié par priorité d'urgence
          </span>
        </div>

        {products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-xl mb-2">
              ✓
            </div>
            <p className="text-sm font-bold text-fg">Tout le stock est suffisant !</p>
            <p className="text-xs text-fg-muted mt-1">
              Aucun produit n'est actuellement sous son seuil d'alerte.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-blue-50/50 dark:bg-slate-800/40 text-fg-muted font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Article</th>
                  <th className="py-3.5 px-4">Catégorie</th>
                  <th className="py-3.5 px-4 text-center">État du Stock</th>
                  <th className="py-3.5 px-4 text-right">Seuil d'Alerte</th>
                  <th className="py-3.5 px-4 text-right">Prix Vente</th>
                  {isPatronne && (
                    <th className="py-3.5 px-4 text-right">Action Rapide</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => {
                  const isZero = p.stock_quantity === 0;

                  return (
                    <tr key={p.id} className="hover:bg-bg-subtle/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-fg">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg-subtle text-accent font-bold text-xs">
                            {p.name[0]}
                          </span>
                          <span>{p.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2.5 py-1 text-[11px] font-bold">
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                            RUPTURE TOTALE (0)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2.5 py-1 text-[11px] font-bold">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            CRITIQUE ({p.stock_quantity} restant{p.stock_quantity > 1 ? 's' : ''})
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-fg-muted font-semibold">
                        ≤ {p.alert_threshold}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-fg">
                        {formatFCFA(p.selling_price)}
                      </td>

                      {isPatronne && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setRestockingProduct(p)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white px-3 py-1.5 text-xs font-bold shadow-sm transition-all"
                          >
                            <span>+ Réapprovisionner</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {restockingProduct && (
        <RestockModal
          product={restockingProduct}
          onClose={() => setRestockingProduct(null)}
          onSuccess={() => {
            setRestockingProduct(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
