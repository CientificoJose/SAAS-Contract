import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LegacyPropuestaDinamicaPage({ params }: Props) {
  const { id } = await params;
  redirect(`/p/${id}`);
}
