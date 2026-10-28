'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Product, CartItem } from '@/types/database.types';
import { formatFCFA } from '@/lib/utils';
import { createSale } from '@/app/actions/sales';

export default function VentePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'airtel' | 'mtn'>('especes');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadProducts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('products')
      .select('id, name, category, selling_price, stock_quantity, alert_threshold')
      .gt('stock_quantity', 0)
      .order('name');
    setProducts((data as Product[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = ['Tous', ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Tous' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setError('');
    setSuccessMsg('');
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const maxQty = item.product.stock_quantity;
          const newQty = Math.min(Math.max(0, item.quantity + delta), maxQty);
          return { ...item, quantity: newQty };
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setError('');
    setSuccessMsg('');
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const lowStockCount = products.filter(
    (p) => p.stock_quantity <= p.alert_threshold
  ).length;

  const handleConfirmSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    const items = cart.map((i) => ({
      product_id: i.product.id,
      quantity: i.quantity,
    }));

    const result = await createSale(items);

    if (result.success) {
      setSuccessMsg(
        `Vente validée avec succès ! Total : ${formatFCFA(result.totalAmount || cartTotal)}`
      );
      setCart([]);
      await loadProducts();
    } else {
      setError(result.error || "Erreur lors de l'enregistrement.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <p className="text-xs font-semibold text-fg-muted">Chargement du terminal de caisse...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER (Style SilverLogix) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fg">Caisse & Vente</h1>
          <p className="text-xs md:text-sm text-fg-muted mt-0.5">
            Sélectionnez les articles au comptoir et enregistrez les encaissements instantanément.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-fg shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Mode Comptoir Actif
          </span>
        </div>
      </div>

      {/* 2. LES 4 KPI STAT CARDS (Style SilverLogix avec icônes colorées et courbes sparklines) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 : Produits Disponibles */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Articles Actifs</p>
              <p className="text-xl font-black text-fg">{products.length}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-fg-muted">Catalogue réel</span>
            <span className="font-bold text-accent">{products.length} en stock</span>
          </div>
        </div>

        {/* Card 2 : Articles en Panier */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Articles Panier</p>
              <p className="text-xl font-black text-fg">{cartItemCount}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-fg-muted">{cart.length} référence(s)</span>
            <span className="font-bold text-emerald-600">En cours</span>
          </div>
        </div>

        {/* Card 3 : Total Panier en cours */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <span className="font-black text-lg">FCFA</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Total Commande</p>
              <p className="text-lg lg:text-xl font-black text-fg truncate">
                {formatFCFA(cartTotal)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-purple-600">Net sans décimales</span>
            <span className="font-bold text-purple-600">Comptant</span>
          </div>
        </div>

        {/* Card 4 : Alertes Stock */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-fg-muted">Stocks Critiques</p>
              <p className="text-xl font-black text-amber-600">{lowStockCount}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-border/50">
            <span className="font-semibold text-amber-600">
              {lowStockCount > 0 ? 'À réapprovisionner' : 'Stock optimal'}
            </span>
            <span className="font-bold text-amber-600">Alerte</span>
          </div>
        </div>
      </div>

      {/* Messages Alerte / Succès */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger-border bg-danger-bg p-4 text-xs font-semibold text-danger shadow-sm">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-sm">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* 3. SECTION CATALOGUE ET PANIER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne Catalogue (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Barre de Recherche et Catégories */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-fg-muted pointer-events-none">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Chercher un article (ex: Riz, Bière, Savon)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-bg pl-9 pr-4 text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
                />
              </div>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="px-3 py-1.5 rounded-xl border border-border text-xs text-fg-muted hover:text-fg"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Pills Catégories */}
            <div className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-accent text-accent-fg shadow-sm'
                      : 'border border-border bg-bg hover:bg-bg-subtle text-fg-muted hover:text-fg'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grille des Produits */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-subtle text-fg-muted mb-3">
                🔍
              </div>
              <p className="text-sm font-semibold text-fg">Aucun article trouvé</p>
              <p className="text-xs text-fg-muted mt-1">
                Essayez un autre mot-clé ou réinitialisez les filtres.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((product) => {
                const inCart = cart.find((i) => i.product.id === product.id);
                const isLow = product.stock_quantity <= product.alert_threshold;

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-4 text-left shadow-sm hover:shadow-md hover:border-accent/60 transition-all duration-200 active:scale-[0.98]"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {product.category}
                        </span>
                        {inCart && (
                          <span className="rounded-full bg-accent text-white px-2 py-0.5 text-[10px] font-black shadow-sm">
                            x{inCart.quantity}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-fg group-hover:text-accent transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                      <div>
                        <p className="text-base font-black text-fg tracking-tight">
                          {formatFCFA(product.selling_price)}
                        </p>
                        <p
                          className={`text-[11px] font-semibold flex items-center gap-1 ${
                            isLow ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {product.stock_quantity} en stock
                        </p>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                        +
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Colonne Panier & Encaissement (4 cols) */}
        <div className="lg:col-span-4 sticky top-20 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-chic">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent font-bold text-sm">
                  🛒
                </span>
                <div>
                  <h2 className="font-bold text-sm text-fg leading-none">Panier En Cours</h2>
                  <p className="text-[11px] text-fg-muted mt-0.5">
                    {cartItemCount} article{cartItemCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs font-semibold text-danger hover:underline"
                >
                  Vider
                </button>
              )}
            </div>

            {/* Liste des articles du panier */}
            {cart.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-subtle text-fg-muted text-xl mb-2">
                  🛍️
                </div>
                <p className="text-xs font-semibold text-fg-muted">Le panier est vide</p>
                <p className="text-[11px] text-fg-muted/70 mt-1">
                  Touchez un article dans le catalogue pour l'ajouter.
                </p>
              </div>
            ) : (
              <div className="space-y-4 mt-3">
                <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 divide-y divide-border/50">
                  {cart.map((item) => (
                    <div key={item.product.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-fg truncate">{item.product.name}</p>
                        <p className="text-[11px] text-fg-muted">
                          {formatFCFA(item.product.selling_price)} x {item.quantity} ={' '}
                          <span className="font-bold text-fg">
                            {formatFCFA(item.product.selling_price * item.quantity)}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => updateQty(item.product.id, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-bg text-xs font-bold hover:bg-bg-subtle"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-xs font-black text-fg">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.product.id, 1)}
                          disabled={item.quantity >= item.product.stock_quantity}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-bg text-xs font-bold hover:bg-bg-subtle disabled:opacity-30"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="flex h-7 w-7 items-center justify-center text-danger hover:bg-danger-bg rounded-lg ml-0.5"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mode de Paiement */}
                <div className="pt-3 border-t border-border">
                  <label className="block text-xs font-bold text-fg mb-2">
                    Mode de Paiement :
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'especes', label: 'Espèces', icon: '💵' },
                      { id: 'airtel', label: 'Airtel', icon: '🔴' },
                      { id: 'mtn', label: 'MTN MoMo', icon: '🟡' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPaymentMethod(mode.id as any)}
                        className={`flex flex-col items-center justify-center rounded-xl p-2 text-center text-xs font-bold transition-all ${
                          paymentMethod === mode.id
                            ? 'border-2 border-accent bg-accent/10 text-accent'
                            : 'border border-border bg-bg text-fg-muted hover:border-border-focus'
                        }`}
                      >
                        <span className="text-base mb-0.5">{mode.icon}</span>
                        <span className="text-[11px] leading-tight">{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total & Action */}
                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-fg-muted uppercase">Montant Net :</span>
                    <span className="text-2xl font-black text-fg tracking-tight">
                      {formatFCFA(cartTotal)}
                    </span>
                  </div>

                  <button
                    onClick={handleConfirmSale}
                    disabled={submitting}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-3.5 text-sm shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Validation en cours...' : 'Valider & Encaisser (FCFA)'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
