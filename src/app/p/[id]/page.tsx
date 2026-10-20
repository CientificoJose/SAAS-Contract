import { notFound } from 'next/navigation';
import { getProposalById, getSettings } from '@/lib/actions';
import { DynamicContractClient } from '@/features/contracts/components/dynamic-contract-client';
import type { Metadata } from 'next';

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { proposal, creatorProfile } = await getProposalById(id);

  if (!proposal) {
    return {
      title: 'Propuesta no encontrada',
      robots: { index: false, follow: false }
    };
  }

  const providerName = creatorProfile?.tenant_name || 'ContractCloud';

  return {
    title: `Propuesta Comercial #${proposal.invoice_number} - ${proposal.client_company} | ${providerName}`,
    description: `Contrato de servicios para ${proposal.client_company} (${proposal.client_name}) emitido por ${providerName}`,
    robots: { index: false, follow: false }
  };
}

export default async function PublicProposalPage({ params }: Props) {
  const { id } = await params;
  const [{ proposal, credentials, services, payments, collaborators, creatorProfile, paymentMethods }, settings] = await Promise.all([
    getProposalById(id),
    getSettings()
  ]);

  if (!proposal) {
    notFound();
  }

  return (
    <DynamicContractClient
      proposal={proposal}
      credentials={credentials}
      services={services}
      payments={payments}
      collaborators={collaborators}
      globalSettings={settings}
      creatorProfile={creatorProfile}
      paymentMethods={paymentMethods}
    />
  );
}
