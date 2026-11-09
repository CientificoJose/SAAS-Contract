import { notFound } from 'next/navigation';
import { getProposalById, getCatalog, getPaymentMethods, getCurrentUser } from '@/lib/actions';
import { EditProposalForm } from '@/features/contracts/components/edit-proposal-form';

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarPropuestaPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  const [proposalData, catalog, paymentMethods] = await Promise.all([
    getProposalById(id),
    getCatalog(),
    getPaymentMethods(user?.id)
  ]);

  if (!proposalData || !proposalData.proposal) {
    notFound();
  }

  return (
    <EditProposalForm
      proposal={proposalData.proposal}
      initialServices={proposalData.services}
      initialCredentials={proposalData.credentials}
      initialPayments={proposalData.payments}
      initialCollaborators={proposalData.collaborators}
      catalog={catalog}
      paymentMethodsList={paymentMethods}
    />
  );
}
