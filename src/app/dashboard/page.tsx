import { getProposals, getCatalog, getSettings, getCurrentUser, getPaymentMethods } from '@/lib/actions';
import { ContractsDashboardClient } from '@/features/contracts/components/contracts-dashboard-client';

export const revalidate = 0;

export default async function DashboardPage() {
  const [proposals, catalog, settings, user, paymentMethods] = await Promise.all([
    getProposals(),
    getCatalog(),
    getSettings(),
    getCurrentUser(),
    getPaymentMethods()
  ]);

  const userEmail = user?.email || 'qijoos3niievsik@gmail.com';
  const userRole = userEmail === 'qijoos3niievsik@gmail.com' ? 'admin' : 'user';

  return (
    <ContractsDashboardClient
      initialProposals={proposals}
      initialCatalog={catalog}
      initialSettings={settings}
      initialPaymentMethods={paymentMethods}
      userRole={userRole}
    />
  );
}
