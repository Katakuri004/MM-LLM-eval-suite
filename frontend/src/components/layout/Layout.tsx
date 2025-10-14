/**
 * Main layout component with header and content area
 */

import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Toaster } from '@/components/ui/toaster';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
