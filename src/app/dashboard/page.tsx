import { getProposals, getCatalog, getSettings, getCurrentUser } from '@/lib/actions';
import { ContractsDashboardClient } from '@/features/contracts/components/contracts-dashboard-client';

export const revalidate = 0;

export default async function DashboardPage() {
  const [proposals, catalog, settings, user] = await Promise.all([
    getProposals(),
    getCatalog(),
    getSettings(),
    getCurrentUser()
  ]);

  const userEmail = user?.email || 'qijoos3niievsik@gmail.com';
  const userRole = userEmail === 'qijoos3niievsik@gmail.com' ? 'admin' : 'user';

  return (
    <ContractsDashboardClient
      initialProposals={proposals}
      initialCatalog={catalog}
      initialSettings={settings}
      userRole={userRole}
    />
  );
}
