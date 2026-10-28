import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { AppNavigation } from '@/components/AppNavigation';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Profile } from '@/types/database.types';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Boutique Brazza - Gestion de caisse',
  description: 'Application de gestion de boutique pour commerçants au Congo-Brazzaville.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Boutique Brazza',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f6b46' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

async function getUserData() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    // Compter les produits en stock bas
    const { count: lowStockCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .filter('stock_quantity', 'lte', 'alert_threshold');

    return {
      user: {
        id: user.id,
        email: user.email!,
        fullName: (profile as Profile).full_name,
        role: (profile as Profile).role,
      },
      lowStockCount: lowStockCount || 0,
    };
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const userData = await getUserData();

  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {userData ? (
            <AppNavigation
              user={userData.user}
              lowStockCount={userData.lowStockCount}
            >
              {children}
            </AppNavigation>
          ) : (
            <main>{children}</main>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
