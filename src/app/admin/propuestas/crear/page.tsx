import { redirect } from 'next/navigation';

export default function LegacyCrearRedirect() {
  redirect('/dashboard/propuestas/crear');
}
