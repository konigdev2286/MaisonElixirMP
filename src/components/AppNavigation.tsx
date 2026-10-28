'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from './ThemeToggle';
import { UserRole } from '@/types/database.types';

interface AppNavigationProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
  };
  lowStockCount?: number;
  children: React.ReactNode;
}

export function AppNavigation({ user, lowStockCount = 0, children }: AppNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isPatronne = user.role === 'patronne';

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/connexion');
    router.refresh();
  };

  const navLinks = [
    {
      href: '/vente',
      label: 'Caisse & Vente',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      href: '/produits',
      label: 'Produits & Stock',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      href: '/stock-bas',
      label: 'Alertes Stock',
      count: lowStockCount,
      warning: lowStockCount > 0,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      href: '/historique',
      label: 'Historique Ventes',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    ...(isPatronne
      ? [
          {
            href: '/rapports',
            label: 'Rapports Financiers',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
          },
          {
            href: '/equipe',
            label: 'Gestion Équipe',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  // Obtenir les initiales de l'utilisateur
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const currentDateFormatted = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const renderNavLinks = () => (
    <div className="space-y-1.5 px-3 py-4">
      {navLinks.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`group flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
              isActive
                ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-900/30 font-semibold'
                : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={isActive ? 'text-white' : 'text-blue-200 group-hover:text-white'}>
                {link.icon}
              </span>
              <span>{link.label}</span>
            </div>
            {link.count !== undefined && link.count > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  link.warning
                    ? 'bg-amber-400 text-amber-950'
                    : 'bg-white/20 text-white'
                }`}
              >
                {link.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-bg">
      {/* SIDEBAR GAUCHE (Desktop / Tablette) Style SilverLogix - Fixe */}
      <aside className="hidden md:flex md:w-64 lg:w-72 h-full flex-col justify-between bg-gradient-to-b from-[#1d4ed8] via-[#1e40af] to-[#1e3a8a] text-white flex-shrink-0 shadow-xl overflow-y-auto z-20">
        <div>
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-blue-400/20">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#1d4ed8] shadow-md font-black text-lg">
              BB
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-white leading-tight">
                Boutique Brazza
              </div>
              <div className="text-xs text-blue-200 font-medium">
                Caisse & Gestion
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-2">{renderNavLinks()}</nav>
        </div>

        {/* Widget bas de sidebar : Alerte / Statut */}
        <div className="p-4 m-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-blue-100">Caisse En Ligne</span>
          </div>
          <p className="text-xs text-blue-200 mb-3">
            Monnaie : <strong className="text-white">FCFA</strong> (Brazzaville)
          </p>
          <Link
            href="/vente"
            className="block w-full text-center rounded-xl bg-white text-[#1d4ed8] hover:bg-blue-50 py-2 text-xs font-bold shadow-sm transition-all"
          >
            + Nouvelle Vente
          </Link>
        </div>
      </aside>

      {/* MOBILE DRAWER (Slide-over) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex w-72 max-w-[80%] flex-col justify-between bg-gradient-to-b from-[#1d4ed8] via-[#1e40af] to-[#1e3a8a] text-white p-2 shadow-2xl">
            <div>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#1d4ed8] font-bold text-sm">
                    BB
                  </div>
                  <span className="font-bold text-white">Boutique Brazza</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white"
                >
                  ✕
                </button>
              </div>
              <nav className="mt-2">{renderNavLinks()}</nav>
            </div>
            <div className="p-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full rounded-xl bg-red-500/20 text-red-200 border border-red-500/30 py-2.5 text-xs font-bold hover:bg-red-500/30"
              >
                Se déconnecter
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ZONE CENTRALE (Header Supérieur Fixe + Défilement Contenu) */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden">
        {/* TOP BAR / HEADER (Style SilverLogix) - Toujours fixé au top */}
        <header className="sticky top-0 z-30 shrink-0 flex h-16 items-center justify-between border-b border-border bg-card/95 backdrop-blur-md px-4 md:px-8 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger Button (Mobile) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl border border-border text-fg hover:bg-bg-subtle"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Barre de Recherche Globale avec raccourci Ctrl+K */}
            <div className="relative hidden sm:block w-64 lg:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-fg-muted pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Rechercher produit, vente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-bg pl-9 pr-14 text-xs text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                <kbd className="rounded bg-bg-subtle border border-border px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">
                  Ctrl K
                </kbd>
              </span>
            </div>
          </div>

          {/* Outils & Profil utilisateur */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Date Pill */}
            <div className="hidden lg:flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-fg-muted shadow-sm">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{currentDateFormatted}</span>
            </div>

            {/* Notification Bell (Stock bas) */}
            <Link
              href="/stock-bas"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-fg-muted hover:text-fg hover:border-border-focus transition-colors shadow-sm"
              title="Alertes de stock"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white ring-2 ring-card animate-pulse">
                  {lowStockCount}
                </span>
              )}
            </Link>

            {/* Theme Toggle (Dark/Light) */}
            <ThemeToggle />

            {/* Profil Utilisateur (Chic Avatar + Infos + Déconnexion) */}
            <div className="flex items-center gap-3 pl-2 border-l border-border">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xs shadow-sm ring-2 ring-card">
                {getInitials(user.fullName)}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>

              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-fg leading-tight">
                  {user.fullName}
                </div>
                <div className="text-[11px] font-semibold text-accent capitalize">
                  {user.role}
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="hidden sm:flex p-1.5 rounded-lg text-fg-muted hover:text-danger hover:bg-danger-bg transition-colors"
                title="Se déconnecter"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* CONTENU PRINCIPAL */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
