import type { Metadata } from 'next';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { getSettings, getCurrentUser } from '@/lib/actions';

export const metadata: Metadata = {
  title: 'Contract Press Cloud - Sistema de Contratos & Propuestas',
  description: 'Gestor de contratos, propuestas comerciales y facturación SaaS',
  robots: {
    index: false,
    follow: false
  }
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([
    getSettings(),
    getCurrentUser()
  ]);

  const brandName = settings.brand_name || 'ContractPress';
  const brandLogo = settings.brand_logo || 'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg';
  const userEmail = user?.email || 'qijoos3niievsik@gmail.com';
  const isAdmin = user?.role === 'admin' || userEmail === 'qijoos3niievsik@gmail.com';

  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <DashboardHeader
        brandName={brandName}
        brandLogo={brandLogo}
        userEmail={userEmail}
        isAdmin={isAdmin}
      />
      <main id='main-content' className='flex-1 pb-16'>
        {children}
      </main>
    </div>
  );
}
