'use server';

import { supabaseAdmin } from './supabase/admin';
import { createClient } from './supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import type {
  Proposal,
  ProposalService,
  ProposalPayment,
  ProposalCollaborator,
  Credential,
  CatalogCategory,
  CatalogService,
  CatalogServicePlan
} from './supabase/types';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'qijoos3niievsik@gmail.com';

// ==========================================
// AUTH & ROLE HELPERS
// ==========================================

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    // Fetch tenant profile
    let profile: any = null;
    const { data: profData } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profData) {
      profile = profData;
    } else {
      // Create initial profile if missing
      const newProf = {
        id: user.id,
        email: user.email || '',
        role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
        full_name: (user.user_metadata?.full_name as string) || (user.email ? user.email.split('@')[0] : 'Usuario'),
        tenant_name: (user.user_metadata?.tenant_name as string) || 'ContractCloud',
        brand_logo_url: 'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg',
        brand_color_primary: '#0066FF',
        brand_color_secondary: '#00F0FF'
      };
      try {
        await supabaseAdmin.from('profiles').insert(newProf);
      } catch {}
      profile = newProf;
    }

    return {
      id: user.id,
      email: user.email || '',
      role: (profile?.role || (user.email === ADMIN_EMAIL ? 'admin' : 'user')) as 'admin' | 'user',
      profile,
      user_metadata: user.user_metadata || {}
    };
  } catch {
    return null;
  }
}

export async function getTenantProfile(userId?: string) {
  try {
    let targetId = userId;
    if (!targetId) {
      const cur = await getCurrentUser();
      if (!cur) return null;
      targetId = cur.id;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .single();

    return profile;
  } catch (err) {
    console.error('Error in getTenantProfile:', err);
    return null;
  }
}

export async function updateTenantProfile(data: {
  tenant_name?: string;
  brand_logo_url?: string;
  brand_color_primary?: string;
  brand_color_secondary?: string;
  full_name?: string;
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from?: string;
}) {
  try {
    const cur = await getCurrentUser();
    if (!cur) throw new Error('No autorizado');

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', cur.id);

    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating tenant profile:', err);
    throw new Error(err.message || 'Error al actualizar el perfil del tenant');
  }
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut().catch(() => {});
  } catch {}

  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    for (const c of allCookies) {
      if (c.name.startsWith('sb-') || c.name.includes('supabase') || c.name.includes('auth')) {
        cookieStore.delete(c.name);
      }
    }
  } catch {}

  return { success: true };
}

export async function uploadAsset(formData: FormData): Promise<{ url: string }> {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error('No se ha seleccionado ningún archivo');

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const cleanName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `uploads/${cleanName}`;

    const { error } = await supabaseAdmin.storage
      .from('contract-assets')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(error.message || 'Error al subir archivo a Supabase Storage');
    }

    const { data: pubUrl } = supabaseAdmin.storage
      .from('contract-assets')
      .getPublicUrl(filePath);

    return { url: pubUrl.publicUrl };
  } catch (err: any) {
    console.error('Error in uploadAsset:', err);
    throw new Error(err.message || 'Error al procesar subida de archivo');
  }
}

// ==========================================
// PROPOSALS / CONTRACTS
// ==========================================

export async function getProposals(): Promise<(Proposal & { services?: ProposalService[] })[]> {
  try {
    const cur = await getCurrentUser();
    let query = supabaseAdmin
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false });

    // Multi-tenant scoping: if not admin, only fetch current tenant's proposals
    if (cur && cur.role !== 'admin') {
      query = query.eq('user_id', cur.id);
    }

    const { data: proposals, error: pError } = await query;

    if (pError || !proposals) {
      console.error('Error fetching proposals:', pError);
      return [];
    }

    const { data: services, error: sError } = await supabaseAdmin
      .from('proposal_services')
      .select('*');

    if (sError || !services) {
      return proposals as (Proposal & { services?: ProposalService[] })[];
    }

    return proposals.map((p) => ({
      ...p,
      // Fix any legacy /recurso.png or empty logo references
      brand_logo_url: p.brand_logo_url && p.brand_logo_url !== '/recurso.png'
        ? p.brand_logo_url
        : 'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg',
      services: services.filter((s) => s.proposal_id === p.id)
    })) as (Proposal & { services?: ProposalService[] })[];
  } catch (err) {
    console.error('Unexpected error in getProposals:', err);
    return [];
  }
}

export async function getProposalById(id: string): Promise<{
  proposal: Proposal | null;
  credentials: Credential[];
  services: ProposalService[];
  payments: ProposalPayment[];
  collaborators: ProposalCollaborator[];
  creatorProfile?: any | null;
}> {
  try {
    const { data: proposal, error: pError } = await supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('id', id)
      .single();

    if (pError || !proposal) {
      return { proposal: null, credentials: [], services: [], payments: [], collaborators: [], creatorProfile: null };
    }

    // Fix legacy /recurso.png
    if (proposal.brand_logo_url === '/recurso.png' || !proposal.brand_logo_url) {
      proposal.brand_logo_url = 'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg';
    }

    // Fetch creator tenant profile if user_id is present
    let creatorProfile: any = null;
    if (proposal.user_id) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', proposal.user_id)
        .single();
      creatorProfile = prof;
    }

    const [credsRes, servicesRes, paymentsRes, collabRes] = await Promise.all([
      supabaseAdmin.from('credentials').select('*').eq('proposal_id', id),
      supabaseAdmin.from('proposal_services').select('*').eq('proposal_id', id),
      supabaseAdmin.from('proposal_payments').select('*').eq('proposal_id', id).order('payment_date', { ascending: true }),
      supabaseAdmin.from('proposal_collaborators').select('*').eq('proposal_id', id)
    ]);

    return {
      proposal: proposal as Proposal,
      credentials: (credsRes.data || []) as Credential[],
      services: (servicesRes.data || []) as ProposalService[],
      payments: (paymentsRes.data || []) as ProposalPayment[],
      collaborators: (collabRes.data || []) as ProposalCollaborator[],
      creatorProfile
    };
  } catch (err) {
    console.error('Error in getProposalById:', err);
    return { proposal: null, credentials: [], services: [], payments: [], collaborators: [], creatorProfile: null };
  }
}

export async function createProposal(data: {
  id: string;
  client_name: string;
  client_company: string;
  client_domain?: string;
  client_email?: string;
  invoice_number: string;
  payment_status: string;
  payment_date?: string;
  payment_method?: string;
  payment_amount?: number;
  brand_color_primary?: string;
  brand_color_secondary?: string;
  brand_logo_url?: string;
  grace_days?: number;
  late_fee_percentage?: number;
  daily_penalty_fee?: number;
  services: ProposalService[];
  credentials?: Credential[];
  payments?: ProposalPayment[];
  collaborators?: ProposalCollaborator[];
}) {
  try {
    const cur = await getCurrentUser();
    const userId = cur ? cur.id : null;
    const tenantProf = cur?.profile;

    const proposalId = data.id || `prop-${Date.now()}`;
    const totalAmount = data.services.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

    const firstService = data.services[0];

    const brandLogo =
      data.brand_logo_url && data.brand_logo_url !== '/recurso.png'
        ? data.brand_logo_url
        : tenantProf?.brand_logo_url || 'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg';

    const brandPrimary = data.brand_color_primary || tenantProf?.brand_color_primary || '#0066FF';
    const brandSecondary = data.brand_color_secondary || tenantProf?.brand_color_secondary || '#00F0FF';

    const { error: pError } = await supabaseAdmin.from('proposals').insert({
      id: proposalId,
      user_id: userId,
      client_name: data.client_name,
      client_company: data.client_company,
      client_domain: data.client_domain || '',
      client_email: data.client_email || '',
      service_name: firstService ? firstService.service_name : '',
      plan_name: firstService ? firstService.plan_name : '',
      price: totalAmount,
      invoice_number: data.invoice_number,
      payment_status: data.payment_status || 'PENDIENTE',
      payment_date: data.payment_date || new Date().toISOString().split('T')[0],
      payment_method: data.payment_method || 'Transferencia',
      payment_amount: data.payment_amount || 0,
      brand_color_primary: brandPrimary,
      brand_color_secondary: brandSecondary,
      brand_logo_url: brandLogo,
      grace_days: data.grace_days || 0,
      late_fee_percentage: data.late_fee_percentage || 0,
      daily_penalty_fee: data.daily_penalty_fee || 0,
      created_at: new Date().toISOString()
    });

    if (pError) throw pError;

    // Insert Services
    if (data.services && data.services.length > 0) {
      const servicesToInsert = data.services.map((s, idx) => ({
        id: s.id || `${proposalId}-srv-${idx + 1}`,
        proposal_id: proposalId,
        category_name: s.category_name,
        service_name: s.service_name,
        plan_name: s.plan_name,
        price: Number(s.price) || 0,
        billing_type: s.billing_type || 'RECURRENT',
        billing_cycle: s.billing_cycle || 'Anual',
        features: s.features || '',
        policies: s.policies || '',
        category_policies: s.category_policies || '',
        status: s.status || 'ACTIVO',
        start_date: s.start_date || new Date().toISOString().split('T')[0],
        expiration_date: s.expiration_date || '',
        suspension_date: s.suspension_date || '',
        domain_included: s.domain_included ? 1 : 0,
        domain_expiration: s.domain_expiration || ''
      }));
      await supabaseAdmin.from('proposal_services').insert(servicesToInsert);
    }

    // Insert Credentials
    if (data.credentials && data.credentials.length > 0) {
      const credsToInsert = data.credentials.map((c) => ({
        proposal_id: proposalId,
        description: c.description,
        email: c.email,
        password: c.password,
        notes: c.notes || '',
        dynamic_fields: c.dynamic_fields || ''
      }));
      await supabaseAdmin.from('credentials').insert(credsToInsert);
    }

    // Insert Payments
    if (data.payments && data.payments.length > 0) {
      const paymentsToInsert = data.payments.map((pm, idx) => ({
        id: pm.id || `${proposalId}-pay-${idx + 1}`,
        proposal_id: proposalId,
        invoice_number: pm.invoice_number || data.invoice_number,
        amount: Number(pm.amount) || 0,
        payment_date: pm.payment_date || '',
        payment_method: pm.payment_method || data.payment_method || 'Transferencia',
        description: pm.description || `Cuota #${idx + 1}`,
        status: pm.status || 'PENDIENTE',
        notes: pm.notes || '',
        due_date: pm.due_date || ''
      }));
      await supabaseAdmin.from('proposal_payments').insert(paymentsToInsert);
    }

    // Insert Collaborators
    if (data.collaborators && data.collaborators.length > 0) {
      const collabToInsert = data.collaborators.map((cb, idx) => ({
        id: cb.id || `${proposalId}-col-${idx + 1}`,
        proposal_id: proposalId,
        name: cb.name,
        role: cb.role || 'Especialista',
        logo_url: cb.logo_url || '',
        contact: cb.contact || ''
      }));
      await supabaseAdmin.from('proposal_collaborators').insert(collabToInsert);
    }

    revalidatePath('/dashboard');
    return { success: true, id: proposalId };
  } catch (err: any) {
    console.error('Error creating proposal:', err);
    throw new Error(err.message || 'Error al crear la propuesta');
  }
}

export async function deleteProposal(id: string) {
  try {
    await supabaseAdmin.from('credentials').delete().eq('proposal_id', id);
    await supabaseAdmin.from('proposal_services').delete().eq('proposal_id', id);
    await supabaseAdmin.from('proposal_payments').delete().eq('proposal_id', id);
    await supabaseAdmin.from('proposal_collaborators').delete().eq('proposal_id', id);
    const { error } = await supabaseAdmin.from('proposals').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting proposal:', err);
    throw new Error(err.message || 'Error al eliminar la propuesta');
  }
}

export async function registerPayment(data: {
  proposal_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
  description?: string;
}) {
  try {
    const paymentId = `pay-${Date.now()}`;
    const { error: payErr } = await supabaseAdmin.from('proposal_payments').insert({
      id: paymentId,
      proposal_id: data.proposal_id,
      amount: data.amount,
      payment_method: data.payment_method,
      payment_date: data.payment_date,
      description: data.description || 'Abono de cuota',
      status: 'PAGADO',
      notes: data.notes || ''
    });

    if (payErr) throw payErr;

    // Recalculate total paid vs proposal price
    const { data: proposal } = await supabaseAdmin
      .from('proposals')
      .select('price, payment_status')
      .eq('id', data.proposal_id)
      .single();

    const { data: allPayments } = await supabaseAdmin
      .from('proposal_payments')
      .select('amount, status')
      .eq('proposal_id', data.proposal_id);

    const totalPaid = (allPayments || [])
      .filter((p) => p.status === 'PAGADO')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const price = Number(proposal?.price) || 0;
    let newStatus = 'PENDIENTE';
    if (totalPaid >= price && price > 0) {
      newStatus = 'PAGADO';
    } else if (totalPaid > 0) {
      newStatus = 'PARCIAL';
    }

    await supabaseAdmin
      .from('proposals')
      .update({
        payment_status: newStatus,
        payment_amount: totalPaid,
        payment_date: data.payment_date,
        payment_method: data.payment_method
      })
      .eq('id', data.proposal_id);

    revalidatePath('/dashboard');
    return { success: true, payment_id: paymentId, totalPaid, newStatus };
  } catch (err: any) {
    console.error('Error registering payment:', err);
    throw new Error(err.message || 'Error al registrar el pago');
  }
}

export async function saveSignature(proposalId: string, signatureImage: string, dateISO?: string) {
  try {
    const signatureDate = dateISO || new Date().toISOString();
    let finalSignatureUrl = signatureImage;

    if (signatureImage && signatureImage.startsWith('data:image/')) {
      try {
        const base64Data = signatureImage.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = `signatures/${proposalId}-${Date.now()}.png`;
        const { error: upErr } = await supabaseAdmin.storage
          .from('contract-assets')
          .upload(filePath, buffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (!upErr) {
          const { data: pubUrl } = supabaseAdmin.storage
            .from('contract-assets')
            .getPublicUrl(filePath);
          finalSignatureUrl = pubUrl.publicUrl;
        }
      } catch (uploadErr) {
        console.warn('Could not upload signature to storage, saving as dataURL fallback', uploadErr);
      }
    }

    const { error } = await supabaseAdmin
      .from('proposals')
      .update({
        signature_image: finalSignatureUrl,
        signature_date: signatureDate
      })
      .eq('id', proposalId);

    if (error) throw error;
    revalidatePath(`/p/${proposalId}`);
    revalidatePath('/dashboard');
    return { success: true, signatureDate, signatureUrl: finalSignatureUrl };
  } catch (err: any) {
    console.error('Error saving signature:', err);
    throw new Error(err.message || 'Error al guardar la firma');
  }
}

// ==========================================
// CATALOG (CATEGORIES, SERVICES, PLANS)
// ==========================================

export async function getCatalog(): Promise<CatalogCategory[]> {
  try {
    const { data: categories, error: cErr } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (cErr || !categories) return [];

    const { data: services, error: sErr } = await supabaseAdmin
      .from('services')
      .select('*')
      .order('name', { ascending: true });

    const { data: plans, error: pErr } = await supabaseAdmin
      .from('service_plans')
      .select('*')
      .order('price', { ascending: true });

    return categories.map((cat) => {
      const catServices = (services || [])
        .filter((s) => s.category_id === cat.id)
        .map((srv) => ({
          ...srv,
          plans: (plans || []).filter((p) => p.service_id === srv.id)
        }));

      return {
        ...cat,
        services: catServices
      };
    });
  } catch (err) {
    console.error('Error in getCatalog:', err);
    return [];
  }
}

export async function createCategory(name: string, policies?: string) {
  try {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
    const { error } = await supabaseAdmin.from('categories').insert({
      id,
      name,
      policies: policies || ''
    });
    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true, id };
  } catch (err: any) {
    console.error('Error creating category:', err);
    throw new Error(err.message || 'Error al crear la categoría');
  }
}

export async function updateCategory(id: string, name: string, policies?: string) {
  try {
    const { error } = await supabaseAdmin
      .from('categories')
      .update({ name, policies: policies || '' })
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating category:', err);
    throw new Error(err.message || 'Error al actualizar la categoría');
  }
}

export async function deleteCategory(id: string) {
  try {
    // Delete cascading plans and services first
    const { data: services } = await supabaseAdmin.from('services').select('id').eq('category_id', id);
    if (services && services.length > 0) {
      const serviceIds = services.map((s) => s.id);
      await supabaseAdmin.from('service_plans').delete().in('service_id', serviceIds);
      await supabaseAdmin.from('services').delete().eq('category_id', id);
    }
    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting category:', err);
    throw new Error(err.message || 'Error al eliminar la categoría');
  }
}

export async function createService(categoryId: string, name: string) {
  try {
    const id = `${categoryId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}` || `srv-${Date.now()}`;
    const { error } = await supabaseAdmin.from('services').insert({
      id,
      category_id: categoryId,
      name
    });
    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true, id };
  } catch (err: any) {
    console.error('Error creating service:', err);
    throw new Error(err.message || 'Error al crear el servicio');
  }
}

export async function updateService(id: string, categoryId: string, name: string) {
  try {
    const { error } = await supabaseAdmin
      .from('services')
      .update({ category_id: categoryId, name })
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating service:', err);
    throw new Error(err.message || 'Error al actualizar el servicio');
  }
}

export async function deleteService(id: string) {
  try {
    await supabaseAdmin.from('service_plans').delete().eq('service_id', id);
    const { error } = await supabaseAdmin.from('services').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting service:', err);
    throw new Error(err.message || 'Error al eliminar el servicio');
  }
}

export async function createServicePlan(
  serviceId: string,
  name: string,
  price: number,
  duration?: string,
  features?: string,
  policies?: string
) {
  try {
    const id = `${serviceId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}` || `plan-${Date.now()}`;
    const { error } = await supabaseAdmin.from('service_plans').insert({
      id,
      service_id: serviceId,
      name,
      price,
      duration: duration || '1 año',
      features: features || '',
      policies: policies || ''
    });
    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true, id };
  } catch (err: any) {
    console.error('Error creating plan:', err);
    throw new Error(err.message || 'Error al crear el plan');
  }
}

export async function updateServicePlan(
  id: string,
  name: string,
  price: number,
  duration?: string,
  features?: string,
  policies?: string
) {
  try {
    const { error } = await supabaseAdmin
      .from('service_plans')
      .update({
        name,
        price,
        duration: duration || '1 año',
        features: features || '',
        policies: policies || ''
      })
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating plan:', err);
    throw new Error(err.message || 'Error al actualizar el plan');
  }
}

export async function deleteServicePlan(id: string) {
  try {
    const { error } = await supabaseAdmin.from('service_plans').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting plan:', err);
    throw new Error(err.message || 'Error al eliminar el plan');
  }
}

// ==========================================
// SETTINGS / BRANDING
// ==========================================

export async function getSettings(): Promise<Record<string, string>> {
  try {
    const cur = await getCurrentUser();
    const { data } = await supabaseAdmin.from('settings').select('*');
    const map: Record<string, string> = {
      brand_name: 'ContractCloud',
      brand_logo: 'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg',
      color_primary: '#0066FF',
      color_secondary: '#00F0FF',
      smtp_host: process.env.SMTP_HOST || 'mail.press-cloud.com',
      smtp_port: process.env.SMTP_PORT || '465',
      smtp_user: process.env.SMTP_USER || 'contract@press-cloud.com',
      smtp_pass: process.env.SMTP_PASS || '',
      smtp_from: process.env.SMTP_FROM || 'Contract <contract@press-cloud.com>'
    };

    if (data && data.length > 0) {
      data.forEach((row) => {
        if (row.value) {
          map[row.key] = row.value;
        }
      });
    }

    // Merge tenant profile if user is authenticated
    if (cur?.profile) {
      const p = cur.profile;
      if (p.tenant_name) map.brand_name = p.tenant_name;
      if (p.brand_logo_url && p.brand_logo_url !== '/recurso.png') map.brand_logo = p.brand_logo_url;
      if (p.brand_color_primary) map.color_primary = p.brand_color_primary;
      if (p.brand_color_secondary) map.color_secondary = p.brand_color_secondary;
      if (p.smtp_host) map.smtp_host = p.smtp_host;
      if (p.smtp_port) map.smtp_port = p.smtp_port;
      if (p.smtp_user) map.smtp_user = p.smtp_user;
      if (p.smtp_pass) map.smtp_pass = p.smtp_pass;
      if (p.smtp_from) map.smtp_from = p.smtp_from;
    }

    return map;
  } catch (err) {
    console.error('Error fetching settings:', err);
    return {
      brand_name: 'ContractCloud',
      brand_logo: 'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg',
      color_primary: '#0066FF',
      color_secondary: '#00F0FF',
      smtp_host: process.env.SMTP_HOST || 'mail.press-cloud.com',
      smtp_port: process.env.SMTP_PORT || '465',
      smtp_user: process.env.SMTP_USER || 'contract@press-cloud.com',
      smtp_pass: process.env.SMTP_PASS || '',
      smtp_from: process.env.SMTP_FROM || 'Contract <contract@press-cloud.com>'
    };
  }
}

export async function updateSettings(settings: Record<string, string>) {
  try {
    const cur = await getCurrentUser();

    // 1. If logged in, persist to tenant profile in profiles table
    if (cur) {
      await updateTenantProfile({
        tenant_name: settings.brand_name,
        brand_logo_url: settings.brand_logo,
        brand_color_primary: settings.color_primary,
        brand_color_secondary: settings.color_secondary,
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user,
        smtp_pass: settings.smtp_pass,
        smtp_from: settings.smtp_from
      });
    }

    // 2. If admin or system fallback, update global settings table
    if (!cur || cur.role === 'admin') {
      const entries = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value || ''
      }));

      for (const item of entries) {
        await supabaseAdmin.from('settings').upsert(item, { onConflict: 'key' });
      }
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating settings:', err);
    throw new Error(err.message || 'Error al guardar ajustes');
  }
}

// ==========================================
// EMAIL SENDING
// ==========================================

export async function sendTestEmail(recipientEmail: string) {
  try {
    const settings = await getSettings();
    const host = settings.smtp_host || process.env.SMTP_HOST || 'mail.press-cloud.com';
    const portStr = settings.smtp_port || process.env.SMTP_PORT || '465';
    const port = parseInt(portStr);
    const user = settings.smtp_user || process.env.SMTP_USER || 'contract@press-cloud.com';
    const pass = settings.smtp_pass || process.env.SMTP_PASS || '';
    const from = process.env.SMTP_FROM || settings.smtp_from || `"${settings.brand_name || 'ContractCloud'}" <${user}>`;

    if (!host || !user) {
      throw new Error('Servidor SMTP no configurado');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: `Prueba de configuración de correo - ${settings.brand_name || 'ContractCloud'}`,
      text: 'Este es un correo de prueba enviado desde tu gestor de contratos.',
      html: `<div style="font-family:sans-serif;padding:24px;max-width:550px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <h2 style="color:${settings.color_primary || '#0066FF'};margin:0;">¡Configuración Exitosa!</h2>
        </div>
        <p style="color:#334155;font-size:15px;line-height:1.6;">Tu servidor SMTP está listo para enviar propuestas comerciales y notificaciones de contratos a tus clientes.</p>
        <p style="color:#64748b;font-size:13px;margin-top:20px;border-top:1px solid #f1f5f9;padding-top:12px;">Enviado desde <strong>${settings.brand_name || 'ContractCloud'}</strong> • contract.press-cloud.com</p>
      </div>`
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error sending test email:', err);
    throw new Error(err.message || 'Error al enviar correo de prueba');
  }
}

export async function sendProposalEmail(proposalId: string, recipientEmail: string) {
  try {
    const [{ proposal, creatorProfile }, globalSettings] = await Promise.all([
      getProposalById(proposalId),
      getSettings()
    ]);

    if (!proposal) throw new Error('Propuesta no encontrada');

    // Tenant-aware SMTP credentials & branding
    const host = creatorProfile?.smtp_host || globalSettings.smtp_host || process.env.SMTP_HOST || 'mail.press-cloud.com';
    const portStr = creatorProfile?.smtp_port || globalSettings.smtp_port || process.env.SMTP_PORT || '465';
    const port = parseInt(portStr);
    const user = creatorProfile?.smtp_user || globalSettings.smtp_user || process.env.SMTP_USER || 'contract@press-cloud.com';
    const pass = creatorProfile?.smtp_pass || globalSettings.smtp_pass || process.env.SMTP_PASS || '';
    const brandName = creatorProfile?.tenant_name || globalSettings.brand_name || 'ContractCloud';
    const primaryColor = proposal.brand_color_primary || creatorProfile?.brand_color_primary || globalSettings.color_primary || '#0066FF';
    const from = creatorProfile?.smtp_from || globalSettings.smtp_from || process.env.SMTP_FROM || `"${brandName}" <${user}>`;

    if (!host || !user) {
      throw new Error('Servidor SMTP no configurado');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://contract.press-cloud.com'}/p/${proposal.id}`;

    await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: `Propuesta Comercial #${proposal.invoice_number} - ${proposal.client_company}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;padding:28px;background:#ffffff;">
          <h2 style="color:${primaryColor};margin-top:0;">Propuesta de Servicios y Contrato Comercial</h2>
          <p>Hola <strong>${proposal.client_name}</strong> (${proposal.client_company}),</p>
          <p>Se ha generado la propuesta comercial número <strong>#${proposal.invoice_number}</strong> para tus servicios contratados.</p>
          <p>Puedes revisar los alcances detallados, formas de pago y formalizar con firma digital desde nuestro portal interactivo:</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${proposalUrl}" style="background-color:${primaryColor};color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">
              Ver Propuesta y Contrato Comercial
            </a>
          </div>
          <p style="font-size:12px;color:#64748b;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">
            Este enlace es único y seguro para ${proposal.client_company} emitido por <strong>${brandName}</strong>.
          </p>
        </div>
      `
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error sending proposal email:', err);
    throw new Error(err.message || 'Error al enviar la propuesta por correo');
  }
}
