'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Product } from '@/types/database.types';
import { formatFCFA } from '@/lib/utils';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  restockProduct,
} from '@/app/actions/products';

type UserRole = 'patronne' | 'vendeur';

const CATEGORIES = [
  'Toutes',
  'Alimentation',
  'Boissons',
  'Entretien',
  'Électronique',
  'Textile',
  'Autre',
];

function ProductFormModal({
  product,
  onClose,
  onSuccess,
}: {
  product?: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || 'Alimentation',
    selling_price: product?.selling_price?.toString() || '',
    cost_price: product?.cost_price?.toString() || '',
    stock_quantity: product?.stock_quantity?.toString() || '0',
    alert_threshold: product?.alert_threshold?.toString() || '5',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = {
      name: form.name.trim(),
      category: form.category,
      selling_price: parseInt(form.selling_price) || 0,
      cost_price: parseInt(form.cost_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      alert_threshold: parseInt(form.alert_threshold) || 0,
    };

    const result = isEdit
      ? await updateProduct(product!.id, data)
      : await createProduct(data);

    if (!result.success) {
      setError(result.error || 'Erreur lors de la sauvegarde.');
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
              📦
            </div>
            <h2 className="text-base font-black text-fg">
              {isEdit ? 'Modifier le Produit' : 'Ajouter un Nouveau Produit'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-bg-subtle"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-xl border border-danger-border bg-danger-bg p-3 text-xs font-semibold text-danger">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-fg">Nom du produit</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ex: Riz Dinor 5kg"
              className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-fg">Catégorie</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
            >
              {CATEGORIES.filter((c) => c !== 'Toutes').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-fg">Prix de vente (FCFA)</label>
              <input
                required
                type="number"
                min="1"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                placeholder="4500"
                className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-fg">Prix d'achat (FCFA)</label>
              <input
                required
                type="number"
                min="0"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                placeholder="3800"
                className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-fg">Stock initial</label>
              <input
                required
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-fg">Seuil d'alerte</label>
              <input
                required
                type="number"
                min="0"
                value={form.alert_threshold}
                onChange={(e) => setForm({ ...form, alert_threshold: e.target.value })}
                className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-border bg-bg text-xs font-bold text-fg hover:bg-bg-subtle transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-accent text-white text-xs font-black shadow-md shadow-blue-500/20 hover:bg-accent-hover disabled:opacity-50 transition-all"
            >
              {loading ? 'Sauvegarde...' : isEdit ? 'Enregistrer les modifications' : 'Ajouter le Produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
      setError('Entrez une quantité valide supérieure à zéro.');
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
          <h2 className="text-sm font-black text-fg">Réapprovisionnement</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-fg-muted">
            Produit : <strong className="text-fg">{product.name}</strong><br />
            Stock actuel en rayon : <strong className="text-accent">{product.stock_quantity} unités</strong>
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
              {loading ? 'Mise à jour...' : 'Valider l\'Entrée'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProduitsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('vendeur');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile?.role as UserRole) || 'vendeur';
    setUserRole(role);

    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .order('name');

    setProducts((productsData as Product[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûre de vouloir supprimer ce produit du catalogue ?')) {
      return;
    }
    setDeletingId(id);
    setActionError('');
    const result = await deleteProduct(id);
    if (!result.success) {
      setActionError(result.error || 'Erreur lors de la suppression.');
    } else {
      await loadData();
    }
    setDeletingId(null);
  };

  const isPatronne = userRole === 'patronne';

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'Toutes' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalStockUnits = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const totalStockSellingValue = products.reduce(
    (sum, p) => sum + p.selling_price * p.stock_quantity,
    0
  );
  const lowStockCount = products.filter(
    (p) => p.stock_quantity <= p.alert_threshold
  ).length;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-xs font-semibold text-fg-muted">Chargement du catalogue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. HEADER (Style SilverLogix) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Catalogue des Produits</h1>
          <p className="text-xs md:text-sm text-fg-muted mt-0.5">
            Inventaire des stocks, prix en FCFA et réapprovisionnements en rayon.
          </p>
        </div>

        {isPatronne && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 text-xs font-black shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all"
            >
              <span>+ Nouveau Produit</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. LES 4 KPI STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Références</p>
              <p className="text-xl font-black text-fg">{products.length}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-fg-muted">Catalogue</span>
            <span className="font-bold text-accent">{products.length} réf.</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Unités en Rayon</p>
              <p className="text-xl font-black text-fg">{totalStockUnits}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-fg-muted">Total physique</span>
            <span className="font-bold text-emerald-600">{totalStockUnits} unités</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <span className="font-black text-base">FCFA</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Valeur de Vente</p>
              <p className="text-lg lg:text-xl font-black text-fg truncate">
                {formatFCFA(totalStockSellingValue)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-purple-600">Stock total</span>
            <span className="font-bold text-purple-600">Prix vente</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Stocks Faibles</p>
              <p className="text-xl font-black text-amber-600">{lowStockCount}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-amber-600">
              {lowStockCount > 0 ? 'Sous le seuil' : 'Stock sain'}
            </span>
            <span className="font-bold text-amber-600">Alerte</span>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-4 text-xs font-semibold text-danger shadow-sm">
          <span>⚠️</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* 3. TABLE DES PRODUITS (Style SilverLogix) */}
      <div className="rounded-2xl border border-border bg-card shadow-chic overflow-hidden">
        {/* En-tête & Barre de recherche */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold text-sm">
              📦
            </span>
            <h2 className="font-black text-base text-fg">Inventaire des Articles</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Input recherche */}
            <div className="relative w-48 sm:w-60">
              <input
                type="text"
                placeholder="Rechercher produit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-bg pl-8 pr-3 text-xs text-fg focus:border-accent focus:outline-none"
              />
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-fg-muted pointer-events-none">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>

            {/* Sélecteur Catégorie */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 rounded-xl border border-border bg-bg px-3 text-xs text-fg focus:border-accent focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tableau */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-fg">Aucun article correspondant</p>
            <p className="text-xs text-fg-muted mt-1">
              {search ? 'Modifiez votre recherche.' : 'Ajoutez un nouveau produit.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-blue-50/50 dark:bg-slate-800/40 text-fg-muted font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Article</th>
                  <th className="py-3.5 px-4">Catégorie</th>
                  <th className="py-3.5 px-4 text-right">Prix de Vente</th>
                  {isPatronne && (
                    <th className="py-3.5 px-4 text-right">Prix d'Achat</th>
                  )}
                  <th className="py-3.5 px-4 text-center">État du Stock</th>
                  <th className="py-3.5 px-4 text-right">Seuil Alerte</th>
                  {isPatronne && (
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((product) => {
                  const isLow = product.stock_quantity <= product.alert_threshold;
                  const isZero = product.stock_quantity === 0;

                  return (
                    <tr key={product.id} className="hover:bg-bg-subtle/60 transition-colors">
                      {/* Nom Produit */}
                      <td className="py-3.5 px-4 font-bold text-fg">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg-subtle text-accent font-bold text-xs">
                            {product.name[0]}
                          </span>
                          <span>{product.name}</span>
                        </div>
                      </td>

                      {/* Catégorie */}
                      <td className="py-3.5 px-4">
                        <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold">
                          {product.category}
                        </span>
                      </td>

                      {/* Prix de Vente */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-fg">
                        {formatFCFA(product.selling_price)}
                      </td>

                      {/* Prix d'Achat (patronne) */}
                      {isPatronne && (
                        <td className="py-3.5 px-4 text-right font-mono text-fg-muted font-semibold">
                          {formatFCFA(product.cost_price)}
                        </td>
                      )}

                      {/* État du Stock (Pill chic avec puce colorée) */}
                      <td className="py-3.5 px-4 text-center">
                        {isZero ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2.5 py-1 text-[11px] font-bold">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            RUPTURE (0)
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2.5 py-1 text-[11px] font-bold">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            STOCK BAS ({product.stock_quantity})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-bold">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            NORMAL ({product.stock_quantity})
                          </span>
                        )}
                      </td>

                      {/* Seuil Alerte */}
                      <td className="py-3.5 px-4 text-right font-mono text-fg-muted">
                        ≤ {product.alert_threshold}
                      </td>

                      {/* Actions */}
                      {isPatronne && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setRestockingProduct(product)}
                              className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1 font-bold text-[11px] text-accent hover:bg-accent hover:text-white transition-colors"
                            >
                              + Réappro
                            </button>
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setShowForm(true);
                              }}
                              className="rounded-lg border border-border bg-bg px-2.5 py-1 font-semibold text-[11px] text-fg hover:border-accent"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              disabled={deletingId === product.id}
                              className="rounded-lg border border-danger-border bg-danger-bg px-2.5 py-1 font-semibold text-[11px] text-danger hover:bg-red-100 disabled:opacity-40"
                            >
                              {deletingId === product.id ? '...' : 'Suppr'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-bg-subtle/40 text-xs text-fg-muted">
          <div>
            Affichage de <strong>1</strong> à <strong>{filtered.length}</strong> sur <strong>{products.length}</strong> références
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

      {showForm && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingProduct(null);
            loadData();
          }}
        />
      )}

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
