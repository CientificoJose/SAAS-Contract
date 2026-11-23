'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/actions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_PAYMENT_METHODS } from '@/lib/constants/payment-methods';
import type { AdminOverviewData, AdminUserProposalSummary, AdminUserRecord } from './types';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'qijoos3niievsik@gmail.com';

async function requireSuperAdmin() {
  const cur = await getCurrentUser();
  if (!cur || (cur.role !== 'admin' && cur.email !== ADMIN_EMAIL)) {
    throw new Error('No autorizado: Esta sección es exclusiva para el Super Administrador.');
  }
  return cur;
}

interface RawProfileRow {
  id: string;
  role?: string | null;
  full_name?: string | null;
  tenant_name?: string | null;
  brand_logo_url?: string | null;
  brand_color_primary?: string | null;
  brand_color_secondary?: string | null;
  smtp_host?: string | null;
  smtp_user?: string | null;
}

interface RawProposalRow {
  id: string;
  user_id?: string | null;
  client_name?: string | null;
  client_company?: string | null;
  client_email?: string | null;
  invoice_number?: string | null;
  price?: number | string | null;
  payment_amount?: number | string | null;
  payment_status?: string | null;
  signature_image?: string | null;
  signature_date?: string | null;
  created_at?: string | null;
}

interface RawPaymentRow {
  proposal_id: string;
  amount?: number | string | null;
  status?: string | null;
}

interface RawSettingRow {
  key: string;
  value: string;
}

export async function getAdminOverview(): Promise<AdminOverviewData> {
  await requireSuperAdmin();

  const [usersRes, profilesRes, proposalsRes, paymentsRes, settingsRes] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from('profiles').select('*'),
    supabaseAdmin.from('proposals').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('proposal_payments').select('proposal_id, amount, status'),
    supabaseAdmin.from('settings').select('key, value').like('key', 'payment_methods_%')
  ]);

  if (usersRes.error) {
    throw new Error(usersRes.error.message || 'Error al consultar usuarios en Auth');
  }

  const authUsers = usersRes.data?.users || [];
  const profiles = (profilesRes.data || []) as RawProfileRow[];
  const proposals = (proposalsRes.data || []) as RawProposalRow[];
  const allPayments = (paymentsRes.data || []) as RawPaymentRow[];
  const paymentSettings = (settingsRes.data || []) as RawSettingRow[];

  const profileById = new Map<string, RawProfileRow>();
  profiles.forEach((prof) => profileById.set(prof.id, prof));

  const paidByProposalId = new Map<string, number>();
  allPayments.forEach((pm) => {
    if (pm.status === 'PAGADO') {
      const prev = paidByProposalId.get(pm.proposal_id) || 0;
      paidByProposalId.set(pm.proposal_id, prev + (Number(pm.amount) || 0));
    }
  });

  const paymentMethodsMap = new Map<string, number>();
  let globalMethodsCount = DEFAULT_PAYMENT_METHODS.filter((m) => m.enabled).length;

  paymentSettings.forEach((row) => {
    try {
      const parsed: unknown = JSON.parse(row.value);
      if (Array.isArray(parsed)) {
        const enabledCount = parsed.filter(
          (m): m is { enabled?: boolean } =>
            typeof m === 'object' && m !== null && Boolean((m as { enabled?: boolean }).enabled)
        ).length;
        if (row.key === 'payment_methods_global') {
          globalMethodsCount = enabledCount;
        } else if (row.key.startsWith('payment_methods_')) {
          const uid = row.key.replace('payment_methods_', '');
          paymentMethodsMap.set(uid, enabledCount);
        }
      }
    } catch {
      // Ignore malformed JSON
    }
  });

  const records: AdminUserRecord[] = authUsers.map((u) => {
    const prof = profileById.get(u.id);
    const email = u.email || '';
    const role: 'admin' | 'user' =
      prof?.role === 'admin' || email === ADMIN_EMAIL ? 'admin' : 'user';

    const userProposalsRaw = proposals.filter((p) => p.user_id === u.id);
    const userProposals: AdminUserProposalSummary[] = userProposalsRaw.map((p) => {
      const fromPayments = paidByProposalId.get(p.id) || 0;
      const fromHeader = Number(p.payment_amount) || 0;
      const collected = Math.max(fromPayments, fromHeader);

      return {
        id: p.id,
        client_name: p.client_name || '',
        client_company: p.client_company || '',
        client_email: p.client_email || '',
        invoice_number: p.invoice_number || '',
        price: Number(p.price) || 0,
        payment_amount: collected,
        payment_status: p.payment_status || 'PENDIENTE',
        is_signed: Boolean(p.signature_image),
        signature_date: p.signature_date || null,
        created_at: p.created_at || ''
      };
    });

    const totalQuoted = userProposals.reduce((sum, p) => sum + p.price, 0);
    const totalCollected = userProposals.reduce((sum, p) => sum + p.payment_amount, 0);
    const signedCount = userProposals.filter((p) => p.is_signed).length;
    const paidCount = userProposals.filter((p) => p.payment_status === 'PAGADO').length;

    return {
      id: u.id,
      email,
      full_name:
        prof?.full_name ||
        (u.user_metadata?.full_name as string) ||
        (u.user_metadata?.name as string) ||
        (email ? email.split('@')[0] : 'Usuario'),
      tenant_name: prof?.tenant_name || (u.user_metadata?.tenant_name as string) || 'ContractCloud',
      role,
      brand_logo_url:
        prof?.brand_logo_url ||
        'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg',
      brand_color_primary: prof?.brand_color_primary || '#0066FF',
      brand_color_secondary: prof?.brand_color_secondary || '#00F0FF',
      email_confirmed: Boolean(u.email_confirmed_at),
      created_at: u.created_at || '',
      last_sign_in_at: u.last_sign_in_at || null,
      smtp_configured: Boolean(prof?.smtp_host && prof?.smtp_user),
      payment_methods_count: paymentMethodsMap.has(u.id)
        ? paymentMethodsMap.get(u.id)!
        : globalMethodsCount,
      proposals_count: userProposals.length,
      signed_count: signedCount,
      paid_count: paidCount,
      total_quoted: totalQuoted,
      total_collected: totalCollected,
      proposals: userProposals
    };
  });

  // Sort: admin first, then by proposals count descending, then created_at descending
  records.sort((a, b) => {
    if (a.role !== b.role) return a.role === 'admin' ? -1 : 1;
    if (b.proposals_count !== a.proposals_count) return b.proposals_count - a.proposals_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Also check if there are orphan proposals without a matching auth user
  const knownUserIds = new Set(authUsers.map((u) => u.id));
  const orphanProposals = proposals.filter((p) => !p.user_id || !knownUserIds.has(p.user_id));

  const totalProposalsCount = proposals.length;
  const totalSignedCount = proposals.filter((p) => Boolean(p.signature_image)).length;
  const totalQuotedUsd =
    records.reduce((acc, u) => acc + u.total_quoted, 0) +
    orphanProposals.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
  const totalCollectedUsd =
    records.reduce((acc, u) => acc + u.total_collected, 0) +
    orphanProposals.reduce((acc, p) => {
      const fromPayments = paidByProposalId.get(p.id) || 0;
      const fromHeader = Number(p.payment_amount) || 0;
      return acc + Math.max(fromPayments, fromHeader);
    }, 0);

  return {
    stats: {
      total_users: records.length,
      total_agencies: records.filter((u) => u.role === 'user').length,
      total_proposals: totalProposalsCount,
      total_signed: totalSignedCount,
      total_quoted_usd: totalQuotedUsd,
      total_collected_usd: totalCollectedUsd
    },
    users: records,
    adminEmailConfigured: ADMIN_EMAIL
  };
}

export async function adminGenerateAccessToken(targetUserId: string): Promise<{
  email: string;
  token_hash: string;
}> {
  await requireSuperAdmin();

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.admin.getUserById(targetUserId);

  if (userError || !userData?.user?.email) {
    throw new Error(userError?.message || 'Usuario no encontrado en Auth');
  }

  const email = userData.user.email;
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error(linkError?.message || 'No se pudo generar el token de acceso directo');
  }

  return {
    email,
    token_hash: linkData.properties.hashed_token
  };
}

export async function adminSetUserPassword(
  targetUserId: string,
  newPassword: string
): Promise<{ success: boolean }> {
  await requireSuperAdmin();

  if (!newPassword || newPassword.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
    password: newPassword
  });

  if (error) {
    throw new Error(error.message || 'Error al actualizar la contraseña del usuario');
  }

  return { success: true };
}

export async function adminCreateUser(payload: {
  email: string;
  password: string;
  full_name: string;
  tenant_name: string;
  role: 'admin' | 'user';
}): Promise<{ success: boolean; userId: string }> {
  await requireSuperAdmin();

  const email = payload.email.trim().toLowerCase();
  if (!email) throw new Error('El correo electrónico es obligatorio');
  if (!payload.password || payload.password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      full_name: payload.full_name.trim(),
      tenant_name: payload.tenant_name.trim() || 'ContractCloud',
      role: payload.role
    }
  });

  if (error || !data.user) {
    throw new Error(error?.message || 'No se pudo crear el usuario');
  }

  await supabaseAdmin.from('profiles').upsert({
    id: data.user.id,
    email,
    role: payload.role,
    full_name: payload.full_name.trim() || email.split('@')[0],
    tenant_name: payload.tenant_name.trim() || 'ContractCloud',
    brand_logo_url:
      'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg',
    brand_color_primary: '#0066FF',
    brand_color_secondary: '#00F0FF'
  });

  revalidatePath('/dashboard/admin');
  return { success: true, userId: data.user.id };
}

export async function adminUpdateUserRole(
  targetUserId: string,
  newRole: 'admin' | 'user'
): Promise<{ success: boolean }> {
  const cur = await requireSuperAdmin();

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
  if (userData?.user?.email === ADMIN_EMAIL && newRole !== 'admin') {
    throw new Error('No se puede quitar el rol admin al administrador principal del sistema.');
  }
  if (targetUserId === cur.id && newRole !== 'admin') {
    throw new Error('No puedes quitarte el rol de administrador a ti mismo.');
  }

  const { error: pErr } = await supabaseAdmin
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', targetUserId);

  if (pErr) throw new Error(pErr.message);

  await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
    user_metadata: {
      ...userData?.user?.user_metadata,
      role: newRole
    }
  });

  revalidatePath('/dashboard/admin');
  return { success: true };
}
