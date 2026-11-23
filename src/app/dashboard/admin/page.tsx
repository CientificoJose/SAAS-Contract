import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/actions';
import { getAdminOverview } from '@/features/admin/api/actions';
import { AdminDashboardClient } from '@/features/admin/components/admin-dashboard-client';

export const revalidate = 0;

export const metadata = {
  title: 'Centro Super Admin | ContractCloud'
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'qijoos3niievsik@gmail.com';

export default async function AdminPage() {
  const cur = await getCurrentUser();

  if (!cur) {
    redirect('/login');
  }

  if (cur.role !== 'admin' && cur.email !== ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  const data = await getAdminOverview();

  return <AdminDashboardClient initialData={data} currentAdminEmail={cur.email} />;
}
