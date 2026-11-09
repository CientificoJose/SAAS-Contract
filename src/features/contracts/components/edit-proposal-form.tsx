'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateProposal, uploadAsset } from '@/lib/actions';
import type {
  Proposal,
  CatalogCategory,
  Credential,
  ProposalService,
  ProposalCollaborator,
  ProposalPayment,
  PaymentMethodConfig
} from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Icons } from '@/components/icons';

interface ServiceFormState {
  category_id: string;
  service_id: string;
  plan_id: string;
  category_name: string;
  service_name: string;
  plan_name: string;
  price: string;
  billing_type: 'RECURRENT' | 'ONE_TIME';
  billing_cycle: string;
  features: string;
  policies: string;
  start_date: string;
  expiration_date: string;
  domain_included: boolean;
  domain_expiration: string;
}

function detectBillingType(duration?: string): 'RECURRENT' | 'ONE_TIME' {
  if (!duration) return 'RECURRENT';
  const d = duration.toLowerCase();
  if (
    d.includes('único') ||
    d.includes('unico') ||
    d.includes('one') ||
    d.includes('proyecto') ||
    d.includes('puntual') ||
    d.includes('fijo')
  ) {
    return 'ONE_TIME';
  }
  return 'RECURRENT';
}

function computeExpirationDate(
  startDate: string,
  billingType: 'RECURRENT' | 'ONE_TIME',
  cycle: string
): string {
  if (billingType === 'ONE_TIME') return '';
  const baseDate = startDate ? new Date(startDate) : new Date();
  if (isNaN(baseDate.getTime())) return '';
  const d = new Date(baseDate);
  const cycleLower = (cycle || '').toLowerCase();

  if (
    cycleLower.includes('mes') ||
    cycleLower.includes('mensual') ||
    cycleLower.includes('month')
  ) {
    d.setMonth(d.getMonth() + 1);
  } else if (
    cycleLower.includes('trimest') ||
    cycleLower.includes('quarter') ||
    cycleLower.includes('3')
  ) {
    d.setMonth(d.getMonth() + 3);
  } else if (cycleLower.includes('semest') || cycleLower.includes('6')) {
    d.setMonth(d.getMonth() + 6);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().split('T')[0];
}

interface EditProposalFormProps {
  proposal: Proposal;
  initialServices: ProposalService[];
  initialCredentials: Credential[];
  initialPayments: ProposalPayment[];
  initialCollaborators: ProposalCollaborator[];
  catalog: CatalogCategory[];
  paymentMethodsList: PaymentMethodConfig[];
}

export function EditProposalForm({
  proposal,
  initialServices,
  initialCredentials,
  initialPayments,
  initialCollaborators,
  catalog,
  paymentMethodsList
}: EditProposalFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Cliente
  const [clientName, setClientName] = useState(proposal.client_name || '');
  const [clientCompany, setClientCompany] = useState(proposal.client_company || '');
  const [clientDomain, setClientDomain] = useState(proposal.client_domain || '');
  const [clientEmail, setClientEmail] = useState(proposal.client_email || '');
  const [invoiceNumber, setInvoiceNumber] = useState(proposal.invoice_number || '');
  const [paymentStatus, setPaymentStatus] = useState(proposal.payment_status || 'PENDIENTE');
  const [paymentDate, setPaymentDate] = useState(
    proposal.payment_date?.split('T')[0] || new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState(proposal.payment_method || 'Transferencia');

  // Branding
  const [brandColorPrimary, setBrandColorPrimary] = useState(
    proposal.brand_color_primary || '#0066FF'
  );
  const [brandColorSecondary, setBrandColorSecondary] = useState(
    proposal.brand_color_secondary || '#00F0FF'
  );
  const [brandLogoUrl, setBrandLogoUrl] = useState(proposal.brand_logo_url || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Servicios
  const [services, setServices] = useState<ServiceFormState[]>(() => {
    if (initialServices && initialServices.length > 0) {
      return initialServices.map((s) => {
        const matchingCat = catalog.find((c) => c.name === s.category_name);
        const matchingSrv = matchingCat?.services?.find((srv) => srv.name === s.service_name);
        const matchingPlan = matchingSrv?.plans?.find((p) => p.name === s.plan_name);

        return {
          category_id: matchingCat ? matchingCat.id : catalog[0]?.id || '',
          service_id: matchingSrv ? matchingSrv.id : '',
          plan_id: matchingPlan ? matchingPlan.id : '',
          category_name: s.category_name || catalog[0]?.name || 'Servicios',
          service_name: s.service_name,
          plan_name: s.plan_name || 'Personalizado',
          price: (s.price ?? 0).toString(),
          billing_type: s.billing_type || 'RECURRENT',
          billing_cycle: s.billing_cycle || 'Mensual',
          features: s.features || '',
          policies: s.policies || '',
          start_date: s.start_date || new Date().toISOString().split('T')[0],
          expiration_date: s.expiration_date || '',
          domain_included: !!s.domain_included,
          domain_expiration: s.domain_expiration || ''
        };
      });
    }

    if (proposal.service_name) {
      return [
        {
          category_id: catalog[0]?.id || '',
          service_id: '',
          plan_id: '',
          category_name: proposal.category_name || catalog[0]?.name || 'Servicios',
          service_name: proposal.service_name,
          plan_name: proposal.plan_name || 'Personalizado',
          price: (proposal.price ?? 0).toString(),
          billing_type: detectBillingType(proposal.duration),
          billing_cycle: proposal.duration || 'Mensual',
          features: proposal.features || '',
          policies: '',
          start_date: proposal.start_date || new Date().toISOString().split('T')[0],
          expiration_date: proposal.service_expiration || '',
          domain_included: !!proposal.domain_included,
          domain_expiration: proposal.domain_expiration || ''
        }
      ];
    }

    return [];
  });

  // Esquema de Cuotas
  const [scheduleType, setScheduleType] = useState<'full' | '50_50' | 'custom'>(() => {
    if (!initialPayments || initialPayments.length === 0) return 'full';
    if (initialPayments.length === 1) return 'full';
    if (initialPayments.length === 2 && initialPayments[0].description?.includes('50%'))
      return '50_50';
    return 'custom';
  });

  const [payments, setPayments] = useState<ProposalPayment[]>(() => {
    if (initialPayments && initialPayments.length > 0) {
      return initialPayments;
    }
    return [
      {
        description: 'Pago Total Inicial / Contrato',
        amount: Number(proposal.price) || 0,
        status: proposal.payment_status || 'PENDIENTE',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: proposal.payment_method || 'Transferencia',
        due_date: new Date().toISOString().split('T')[0]
      }
    ];
  });

  // Credenciales
  const [credentials, setCredentials] = useState<Credential[]>(() => initialCredentials || []);

  // Colaboradores
  const [collaborators, setCollaborators] = useState<ProposalCollaborator[]>(
    () => initialCollaborators || []
  );

  // Estado de firma previa
  const isAlreadySigned = !!proposal.signature_image;
  const [confirmSignResetModalOpen, setConfirmSignResetModalOpen] = useState(false);

  // Cálculos financieros
  const totalPrice = services.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
  const oneTimeTotal = services
    .filter((s) => s.billing_type === 'ONE_TIME')
    .reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
  const recurrentTotal = services
    .filter((s) => s.billing_type === 'RECURRENT')
    .reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);

  // Recalcular cuotas si el usuario cambia el esquema a full o 50/50
  const applyScheduleType = (type: 'full' | '50_50' | 'custom') => {
    setScheduleType(type);
    const todayISO = new Date().toISOString().split('T')[0];
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 15);
    const deliveryDateISO = deliveryDate.toISOString().split('T')[0];

    const initialStatus = paymentStatus === 'PAGADO' ? 'PAGADO' : 'PENDIENTE';

    if (type === 'full') {
      setPayments([
        {
          description: 'Pago Total Inicial / Contrato',
          amount: totalPrice,
          status: initialStatus,
          payment_date: todayISO,
          payment_method: paymentMethod || 'Transferencia',
          due_date: todayISO
        }
      ]);
    } else if (type === '50_50') {
      const half = Math.round((totalPrice / 2) * 100) / 100;
      const rest = Math.round((totalPrice - half) * 100) / 100;
      setPayments([
        {
          description: 'Cuota 1: Anticipo de Inicio (50%)',
          amount: half,
          status:
            paymentStatus === 'PAGADO' || paymentStatus === 'PARCIAL' ? 'PAGADO' : 'PENDIENTE',
          payment_date: todayISO,
          payment_method: paymentMethod || 'Transferencia',
          due_date: todayISO
        },
        {
          description: 'Cuota 2: Contra Entrega Final (50%)',
          amount: rest,
          status: paymentStatus === 'PAGADO' ? 'PAGADO' : 'PENDIENTE',
          payment_date: paymentStatus === 'PAGADO' ? todayISO : '',
          payment_method: paymentMethod || 'Transferencia',
          due_date: deliveryDateISO
        }
      ]);
    }
  };

  // Handlers para Servicios
  const handleAddService = () => {
    if (catalog.length === 0) return;
    const cat = catalog[0];
    const srv = cat.services && cat.services.length > 0 ? cat.services[0] : null;
    const plan = srv && srv.plans && srv.plans.length > 0 ? srv.plans[0] : null;

    const todayISO = new Date().toISOString().split('T')[0];
    const bType = detectBillingType(plan?.duration);
    const bCycle = bType === 'ONE_TIME' ? 'Pago Único' : plan?.duration || '1 año';
    const expDate = computeExpirationDate(todayISO, bType, bCycle);

    setServices([
      ...services,
      {
        category_id: cat.id,
        service_id: srv ? srv.id : '',
        plan_id: plan ? plan.id : '',
        category_name: cat.name,
        service_name: srv ? srv.name : 'Nuevo Servicio',
        plan_name: plan ? plan.name : 'Personalizado',
        price: plan ? plan.price.toString() : '0',
        billing_type: bType,
        billing_cycle: bCycle,
        features: plan?.features || '',
        policies: plan?.policies || cat.policies || '',
        start_date: todayISO,
        expiration_date: expDate,
        domain_included: false,
        domain_expiration: ''
      }
    ]);
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index: number, field: keyof ServiceFormState, value: any) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'category_id') {
      const cat = catalog.find((c) => c.id === value);
      if (cat) {
        updated[index].category_name = cat.name;
        const firstSrv = cat.services && cat.services.length > 0 ? cat.services[0] : null;
        if (firstSrv) {
          updated[index].service_id = firstSrv.id;
          updated[index].service_name = firstSrv.name;
          const firstPlan = firstSrv.plans && firstSrv.plans.length > 0 ? firstSrv.plans[0] : null;
          if (firstPlan) {
            updated[index].plan_id = firstPlan.id;
            updated[index].plan_name = firstPlan.name;
            updated[index].price = firstPlan.price.toString();
            updated[index].billing_type = detectBillingType(firstPlan.duration);
            updated[index].billing_cycle =
              updated[index].billing_type === 'ONE_TIME'
                ? 'Pago Único'
                : firstPlan.duration || '1 año';
            updated[index].features = firstPlan.features || '';
            updated[index].policies = firstPlan.policies || cat.policies || '';
            updated[index].expiration_date = computeExpirationDate(
              updated[index].start_date,
              updated[index].billing_type,
              updated[index].billing_cycle
            );
          }
        }
      }
    }

    if (field === 'service_id') {
      const cat = catalog.find((c) => c.id === updated[index].category_id);
      const srv = cat?.services?.find((s) => s.id === value);
      if (srv) {
        updated[index].service_name = srv.name;
        const firstPlan = srv.plans && srv.plans.length > 0 ? srv.plans[0] : null;
        if (firstPlan) {
          updated[index].plan_id = firstPlan.id;
          updated[index].plan_name = firstPlan.name;
          updated[index].price = firstPlan.price.toString();
          updated[index].billing_type = detectBillingType(firstPlan.duration);
          updated[index].billing_cycle =
            updated[index].billing_type === 'ONE_TIME'
              ? 'Pago Único'
              : firstPlan.duration || '1 año';
          updated[index].features = firstPlan.features || '';
          updated[index].policies = firstPlan.policies || cat?.policies || '';
          updated[index].expiration_date = computeExpirationDate(
            updated[index].start_date,
            updated[index].billing_type,
            updated[index].billing_cycle
          );
        }
      }
    }

    if (field === 'plan_id') {
      const cat = catalog.find((c) => c.id === updated[index].category_id);
      const srv = cat?.services?.find((s) => s.id === updated[index].service_id);
      const plan = srv?.plans?.find((p) => p.id === value);
      if (plan) {
        updated[index].plan_name = plan.name;
        updated[index].price = plan.price.toString();
        updated[index].billing_type = detectBillingType(plan.duration);
        updated[index].billing_cycle =
          updated[index].billing_type === 'ONE_TIME' ? 'Pago Único' : plan.duration || '1 año';
        updated[index].features = plan.features || '';
        updated[index].policies = plan.policies || cat?.policies || '';
        updated[index].expiration_date = computeExpirationDate(
          updated[index].start_date,
          updated[index].billing_type,
          updated[index].billing_cycle
        );
      }
    }

    if (field === 'start_date' || field === 'billing_cycle' || field === 'billing_type') {
      updated[index].expiration_date = computeExpirationDate(
        updated[index].start_date,
        updated[index].billing_type,
        updated[index].billing_cycle
      );
    }

    setServices(updated);
  };

  // Cuotas
  const handleAddPayment = () => {
    setPayments([
      ...payments,
      {
        description: `Cuota #${payments.length + 1}`,
        amount: 0,
        status: 'PENDIENTE',
        payment_date: '',
        payment_method: paymentMethod || 'Transferencia',
        due_date: ''
      }
    ]);
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (index: number, field: keyof ProposalPayment, value: any) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    setPayments(updated);
  };

  // Credenciales
  const handleAddCredential = () => {
    setCredentials([...credentials, { description: '', email: '', password: '', notes: '' }]);
  };

  const handleRemoveCredential = (index: number) => {
    setCredentials(credentials.filter((_, i) => i !== index));
  };

  const handleCredentialChange = (index: number, field: keyof Credential, value: string) => {
    const updated = [...credentials];
    updated[index] = { ...updated[index], [field]: value };
    setCredentials(updated);
  };

  // Upload Logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      let finalUrl = '';
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          finalUrl = data.url;
        }
      } catch (fetchErr) {
        console.warn('API upload fallback to Server Action:', fetchErr);
      }

      if (!finalUrl) {
        const { url } = await uploadAsset(formData);
        finalUrl = url;
      }

      setBrandLogoUrl(finalUrl);
      toast.success('Logotipo subido exitosamente a Supabase Storage');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir el logotipo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Save Execution
  const executeUpdate = async () => {
    if (!clientName.trim() || !clientCompany.trim()) {
      toast.error('Por favor ingresa el nombre y empresa del cliente');
      return;
    }

    if (services.length === 0) {
      toast.error('Debes incluir al menos un servicio en la propuesta');
      return;
    }

    const formattedServices: ProposalService[] = services.map((s, idx) => ({
      id: `${proposal.id}-srv-${idx + 1}`,
      proposal_id: proposal.id,
      category_name: s.category_name,
      service_name: s.service_name,
      plan_name: s.plan_name,
      price: parseFloat(s.price) || 0,
      billing_type: s.billing_type,
      billing_cycle: s.billing_cycle,
      features: s.features,
      policies: s.policies,
      start_date: s.start_date,
      expiration_date: s.expiration_date,
      domain_included: s.domain_included ? 1 : 0,
      domain_expiration: s.domain_expiration
    }));

    const validCredentials = credentials.filter(
      (c) => c.description.trim() && (c.email?.trim() || c.password?.trim() || c.notes?.trim())
    );

    const initialAmount =
      paymentStatus === 'PAGADO'
        ? totalPrice
        : paymentStatus === 'PARCIAL'
          ? scheduleType === '50_50'
            ? Math.round((totalPrice / 2) * 100) / 100
            : 0
          : 0;

    startTransition(async () => {
      try {
        await updateProposal(proposal.id, {
          client_name: clientName,
          client_company: clientCompany,
          client_domain: clientDomain,
          client_email: clientEmail,
          invoice_number: invoiceNumber,
          payment_status: paymentStatus,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          payment_amount: initialAmount,
          brand_color_primary: brandColorPrimary,
          brand_color_secondary: brandColorSecondary,
          brand_logo_url: brandLogoUrl,
          reset_signature: isAlreadySigned,
          services: formattedServices,
          credentials: validCredentials,
          payments,
          collaborators
        });

        toast.success(
          isAlreadySigned
            ? '¡Propuesta actualizada! La firma previa ha sido reseteada para nueva firma.'
            : '¡Propuesta comercial actualizada exitosamente!'
        );
        router.push('/dashboard');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al actualizar la propuesta');
      }
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadySigned) {
      setConfirmSignResetModalOpen(true);
    } else {
      executeUpdate();
    }
  };

  return (
    <div className='max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6'>
      {/* HEADER & FINANCIAL SUMMARY */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <Link href='/dashboard'>
            <Button
              variant='ghost'
              size='sm'
              className='cursor-pointer text-muted-foreground hover:text-foreground'
            >
              <Icons.chevronLeft className='h-4 w-4 mr-1' />
              Volver al Panel
            </Button>
          </Link>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-2xl font-bold tracking-tight'>Editar Propuesta Comercial</h1>
              <Badge variant='outline' className='font-mono text-xs'>
                #{proposal.invoice_number}
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Modifica términos, servicios, cuotas de pago o accesos confidenciales
            </p>
          </div>
        </div>

        {/* Breakdown financiero en tiempo real */}
        <div className='flex items-center gap-4 bg-muted/40 px-4 py-2 rounded-xl border border-border/50 text-right'>
          {oneTimeTotal > 0 && (
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground block'>
                Pago Único
              </span>
              <span className='text-sm font-bold text-blue-600 dark:text-blue-400'>
                ${oneTimeTotal.toLocaleString()} USD
              </span>
            </div>
          )}
          {recurrentTotal > 0 && (
            <div>
              <span className='text-[10px] uppercase font-bold text-muted-foreground block'>
                Recurrente
              </span>
              <span className='text-sm font-bold text-purple-600 dark:text-purple-400'>
                ${recurrentTotal.toLocaleString()} USD
              </span>
            </div>
          )}
          <div className='pl-3 border-l border-border/50'>
            <span className='text-[10px] uppercase font-bold text-muted-foreground block'>
              Inversión Total
            </span>
            <div className='text-xl font-black text-primary'>
              ${totalPrice.toLocaleString()} USD
            </div>
          </div>
        </div>
      </div>

      {/* ALERTA: CONTRATO YA FIRMADO (OPCIÓN B) */}
      {isAlreadySigned && (
        <div className='p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-start gap-3'>
          <Icons.warning className='h-5 w-5 shrink-0 mt-0.5 text-amber-500' />
          <div className='text-xs space-y-1'>
            <p className='font-bold text-sm text-foreground'>
              Atención: Este contrato ya fue firmado digitalmente
            </p>
            <p className='opacity-90 leading-relaxed'>
              El cliente firmó digitalmente este documento el{' '}
              <strong>
                {proposal.signature_date ? proposal.signature_date.split('T')[0] : 'recientemente'}
              </strong>
              . Si guardas modificaciones, <strong>la firma previa quedará anulada</strong> para que
              el cliente vuelva a firmar la versión con los nuevos términos.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className='space-y-6'>
        {/* SECCIÓN 1: DATOS DEL CLIENTE Y FACTURA */}
        <Card className='border-border/60 bg-card/60 backdrop-blur-sm'>
          <CardHeader>
            <CardTitle className='text-base font-bold flex items-center gap-2'>
              <Icons.user className='h-4 w-4 text-primary' />
              Información del Cliente y Contrato
            </CardTitle>
            <CardDescription>
              Datos del titular o empresa que contrata y detalles de facturación
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='clientCompany'>Empresa / Negocio *</Label>
                <Input
                  id='clientCompany'
                  required
                  placeholder='Ej: Alquimia Company C.A.'
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='clientName'>Nombre del Contacto / Representante *</Label>
                <Input
                  id='clientName'
                  required
                  placeholder='Ej: Valentina Álvarez'
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='clientDomain'>Dominio Principal del Cliente</Label>
                <Input
                  id='clientDomain'
                  placeholder='Ej: alcantarausa.com'
                  value={clientDomain}
                  onChange={(e) => setClientDomain(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='clientEmail'>Correo del Cliente</Label>
                <Input
                  id='clientEmail'
                  type='email'
                  placeholder='cliente@empresa.com'
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/40'>
              <div className='space-y-2'>
                <Label htmlFor='invoiceNumber'>Nº Factura / Identificador</Label>
                <Input
                  id='invoiceNumber'
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='paymentMethod'>Método de Pago Sugerido</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(val) => setPaymentMethod(val || 'Transferencia Bancaria')}
                >
                  <SelectTrigger id='paymentMethod'>
                    <SelectValue placeholder='Selecciona método' />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodsList
                      .filter((m) => m.enabled)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.name}>
                          <div className='flex items-center gap-2'>
                            {m.logo_url && (
                              <img
                                src={m.logo_url}
                                alt={m.name}
                                className='w-4 h-4 object-contain rounded-sm'
                              />
                            )}
                            <span>{m.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    {paymentMethodsList.filter((m) => m.enabled).length === 0 && (
                      <>
                        <SelectItem value='Transferencia Bancaria'>
                          Transferencia Bancaria
                        </SelectItem>
                        <SelectItem value='Binance Pay (USDT)'>Binance Pay (USDT)</SelectItem>
                        <SelectItem value='Zelle'>Zelle</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='paymentStatus'>Estado del Pago</Label>
                <Select
                  value={paymentStatus}
                  onValueChange={(val) => setPaymentStatus(val || 'PENDIENTE')}
                >
                  <SelectTrigger id='paymentStatus'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='PENDIENTE'>Pendiente de Pago</SelectItem>
                    <SelectItem value='PARCIAL'>Abono Parcial</SelectItem>
                    <SelectItem value='PAGADO'>Pagado al 100%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECCIÓN 1.5: BRANDING Y LOGO */}
        <Card className='border-border/60 bg-card/60 backdrop-blur-sm'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base font-bold flex items-center gap-2'>
              <Icons.palette className='h-4 w-4 text-blue-500' />
              Personalización de Marca y Logotipo
            </CardTitle>
            <CardDescription>
              Logo y paleta de colores con los que el cliente visualiza su portal interactivo
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='proposalLogoUpload' className='text-xs font-semibold'>
                  Logotipo para este Contrato
                </Label>
                {brandLogoUrl && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='xs'
                    onClick={() => setBrandLogoUrl('')}
                    className='text-[11px] text-destructive hover:text-destructive/80 cursor-pointer'
                  >
                    Quitar logo personalizado
                  </Button>
                )}
              </div>

              <div className='flex flex-col sm:flex-row items-center gap-4'>
                {brandLogoUrl ? (
                  <div className='h-14 w-32 rounded-lg border border-border/60 bg-slate-950/80 p-2 flex items-center justify-center shrink-0 shadow-inner'>
                    <img
                      src={brandLogoUrl}
                      alt='Logo Propuesta'
                      className='max-h-full max-w-full object-contain'
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/icon.svg';
                      }}
                    />
                  </div>
                ) : null}

                <div className='space-y-2 flex-1 w-full'>
                  <div className='flex items-center gap-2'>
                    <Input
                      id='proposalLogoUpload'
                      type='file'
                      accept='image/svg+xml,image/png,image/jpeg,image/webp'
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className='text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer'
                    />
                    {isUploadingLogo && (
                      <Icons.spinner className='h-4 w-4 animate-spin text-blue-500 shrink-0' />
                    )}
                  </div>
                  <Input
                    value={brandLogoUrl}
                    onChange={(e) => setBrandLogoUrl(e.target.value)}
                    placeholder='URL directa o generada automáticamente desde Supabase...'
                    className='text-xs font-mono text-muted-foreground'
                  />
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='brandColorPrimary' className='text-xs'>
                  Color Primario (Acento / Botones)
                </Label>
                <div className='flex items-center gap-2'>
                  <input
                    type='color'
                    id='brandColorPrimary'
                    value={brandColorPrimary || '#0066FF'}
                    onChange={(e) => setBrandColorPrimary(e.target.value)}
                    className='h-9 w-9 rounded border border-border cursor-pointer p-0 bg-transparent'
                  />
                  <Input
                    value={brandColorPrimary}
                    onChange={(e) => setBrandColorPrimary(e.target.value)}
                    placeholder='#0066FF'
                    className='font-mono text-xs'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='brandColorSecondary' className='text-xs'>
                  Color Secundario (Encabezados / Detalles)
                </Label>
                <div className='flex items-center gap-2'>
                  <input
                    type='color'
                    id='brandColorSecondary'
                    value={brandColorSecondary || '#00F0FF'}
                    onChange={(e) => setBrandColorSecondary(e.target.value)}
                    className='h-9 w-9 rounded border border-border cursor-pointer p-0 bg-transparent'
                  />
                  <Input
                    value={brandColorSecondary}
                    onChange={(e) => setBrandColorSecondary(e.target.value)}
                    placeholder='#00F0FF'
                    className='font-mono text-xs'
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECCIÓN 2: SERVICIOS CONTRATADOS */}
        <Card className='border-border/60 bg-card/60 backdrop-blur-sm'>
          <CardHeader className='flex flex-row items-center justify-between pb-3'>
            <div>
              <CardTitle className='text-base font-bold flex items-center gap-2'>
                <Icons.folder className='h-4 w-4 text-primary' />
                Servicios y Planes Incluidos ({services.length})
              </CardTitle>
              <CardDescription>
                Define la naturaleza de cada servicio (Pago Único para proyectos o Recurrente para
                suscripciones)
              </CardDescription>
            </div>
            <Button
              type='button'
              onClick={handleAddService}
              variant='outline'
              size='sm'
              className='cursor-pointer text-xs'
            >
              <Icons.add className='h-3.5 w-3.5 mr-1' />
              Añadir Servicio
            </Button>
          </CardHeader>
          <CardContent className='space-y-6'>
            {services.map((srv, idx) => {
              const currentCat = catalog.find((c) => c.id === srv.category_id);
              const availableServices = currentCat?.services || [];
              const currentSrv = availableServices.find((s) => s.id === srv.service_id);
              const availablePlans = currentSrv?.plans || [];

              return (
                <div
                  key={idx}
                  className='p-4 rounded-xl border border-border/70 bg-muted/15 space-y-4 relative'
                >
                  <div className='flex items-center justify-between border-b border-border/40 pb-2'>
                    <div className='flex items-center gap-2'>
                      <span className='h-6 w-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center'>
                        {idx + 1}
                      </span>
                      <span className='font-bold text-sm'>
                        {srv.service_name || `Servicio #${idx + 1}`}
                      </span>
                      {srv.billing_type === 'ONE_TIME' ? (
                        <Badge className='bg-blue-500/10 text-blue-500 border border-blue-500/30 text-[10px] py-0'>
                          PAGO ÚNICO
                        </Badge>
                      ) : (
                        <Badge className='bg-purple-500/10 text-purple-500 border border-purple-500/30 text-[10px] py-0'>
                          RECURRENTE ({srv.billing_cycle})
                        </Badge>
                      )}
                    </div>
                    {services.length > 1 && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='xs'
                        onClick={() => handleRemoveService(idx)}
                        className='text-destructive hover:text-destructive/80 cursor-pointer'
                      >
                        <Icons.trash className='h-3.5 w-3.5 mr-1' />
                        Quitar
                      </Button>
                    )}
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    <div className='space-y-1'>
                      <Label className='text-xs'>Categoría del Catálogo</Label>
                      <Select
                        value={srv.category_id}
                        onValueChange={(val) => handleServiceChange(idx, 'category_id', val)}
                      >
                        <SelectTrigger className='text-xs h-8'>
                          <SelectValue placeholder='Selecciona categoría' />
                        </SelectTrigger>
                        <SelectContent>
                          {catalog.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-1'>
                      <Label className='text-xs'>Servicio</Label>
                      <Select
                        value={srv.service_id}
                        onValueChange={(val) => handleServiceChange(idx, 'service_id', val)}
                      >
                        <SelectTrigger className='text-xs h-8'>
                          <SelectValue placeholder='Selecciona servicio' />
                        </SelectTrigger>
                        <SelectContent>
                          {availableServices.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-1'>
                      <Label className='text-xs'>Plan / Paquete</Label>
                      <Select
                        value={srv.plan_id}
                        onValueChange={(val) => handleServiceChange(idx, 'plan_id', val)}
                      >
                        <SelectTrigger className='text-xs h-8'>
                          <SelectValue placeholder='Selecciona plan' />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePlans.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (${p.price} USD)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
                    <div className='space-y-1'>
                      <Label className='text-xs'>Precio (USD) *</Label>
                      <Input
                        type='number'
                        step='0.01'
                        value={srv.price}
                        onChange={(e) => handleServiceChange(idx, 'price', e.target.value)}
                        className='text-xs h-8 font-bold text-primary'
                      />
                    </div>

                    <div className='space-y-1'>
                      <Label className='text-xs'>Modalidad de Cobro</Label>
                      <Select
                        value={srv.billing_type}
                        onValueChange={(val) => handleServiceChange(idx, 'billing_type', val)}
                      >
                        <SelectTrigger className='text-xs h-8'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='ONE_TIME'>⚡ Pago Único (Proyecto)</SelectItem>
                          <SelectItem value='RECURRENT'>🔄 Recurrente (Suscripción)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-1'>
                      <Label className='text-xs'>Frecuencia / Ciclo</Label>
                      {srv.billing_type === 'ONE_TIME' ? (
                        <Input
                          disabled
                          value='Pago Único'
                          className='text-xs h-8 bg-muted text-muted-foreground'
                        />
                      ) : (
                        <Select
                          value={srv.billing_cycle}
                          onValueChange={(val) => handleServiceChange(idx, 'billing_cycle', val)}
                        >
                          <SelectTrigger className='text-xs h-8'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='1 mes'>Mensual</SelectItem>
                            <SelectItem value='3 meses'>Trimestral</SelectItem>
                            <SelectItem value='6 meses'>Semestral</SelectItem>
                            <SelectItem value='1 año'>Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className='space-y-1'>
                      <Label className='text-xs'>Fecha de Inicio</Label>
                      <Input
                        type='date'
                        value={srv.start_date}
                        onChange={(e) => handleServiceChange(idx, 'start_date', e.target.value)}
                        className='text-xs h-8'
                      />
                    </div>
                  </div>

                  {srv.billing_type === 'RECURRENT' && (
                    <div className='text-xs bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 p-2.5 rounded-lg flex items-center justify-between'>
                      <span className='font-medium'>
                        Próxima fecha de renovación calculada automáticamente:
                      </span>
                      <strong className='font-mono'>
                        {srv.expiration_date || 'Calculando...'}
                      </strong>
                    </div>
                  )}

                  <div className='space-y-1'>
                    <Label className='text-xs'>Características y Alcance (1 por línea)</Label>
                    <Textarea
                      rows={3}
                      value={srv.features}
                      onChange={(e) => handleServiceChange(idx, 'features', e.target.value)}
                      placeholder='• Descripción de entregable 1&#10;• Descripción de entregable 2...'
                      className='text-xs font-mono'
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* SECCIÓN 2.5: ESQUEMA DE COBRO Y CUOTAS */}
        <Card className='border-border/60 bg-card/60 backdrop-blur-sm'>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='text-base font-bold flex items-center gap-2'>
                  <Icons.creditCard className='h-4 w-4 text-emerald-500' />
                  Esquema de Cobro y Cronograma de Cuotas
                </CardTitle>
                <CardDescription>
                  Distribución de pagos para el contrato (Total 100%, 50/50 o Cuotas personalizadas)
                </CardDescription>
              </div>
              <div className='flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/50'>
                <Button
                  type='button'
                  variant={scheduleType === 'full' ? 'default' : 'ghost'}
                  size='xs'
                  onClick={() => applyScheduleType('full')}
                  className='text-[11px] cursor-pointer'
                >
                  100% Contado
                </Button>
                <Button
                  type='button'
                  variant={scheduleType === '50_50' ? 'default' : 'ghost'}
                  size='xs'
                  onClick={() => applyScheduleType('50_50')}
                  className='text-[11px] cursor-pointer'
                >
                  50% / 50%
                </Button>
                <Button
                  type='button'
                  variant={scheduleType === 'custom' ? 'default' : 'ghost'}
                  size='xs'
                  onClick={() => setScheduleType('custom')}
                  className='text-[11px] cursor-pointer'
                >
                  Personalizado
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {scheduleType === 'custom' && (
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='outline'
                  size='xs'
                  onClick={handleAddPayment}
                  className='cursor-pointer text-xs'
                >
                  <Icons.add className='h-3 w-3 mr-1' />
                  Añadir Cuota
                </Button>
              </div>
            )}

            <div className='space-y-3'>
              {payments.map((pm, idx) => (
                <div
                  key={idx}
                  className='grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-lg border border-border/50 bg-background/50 items-center'
                >
                  <div className='sm:col-span-4 space-y-1'>
                    <Label className='text-[11px]'>Descripción de la Cuota</Label>
                    <Input
                      value={pm.description}
                      onChange={(e) => handlePaymentChange(idx, 'description', e.target.value)}
                      className='text-xs h-8'
                    />
                  </div>

                  <div className='sm:col-span-2 space-y-1'>
                    <Label className='text-[11px]'>Monto (USD)</Label>
                    <Input
                      type='number'
                      step='0.01'
                      value={pm.amount}
                      onChange={(e) =>
                        handlePaymentChange(idx, 'amount', parseFloat(e.target.value) || 0)
                      }
                      className='text-xs h-8 font-bold'
                    />
                  </div>

                  <div className='sm:col-span-2 space-y-1'>
                    <Label className='text-[11px]'>Fecha Límite</Label>
                    <Input
                      type='date'
                      value={pm.due_date || ''}
                      onChange={(e) => handlePaymentChange(idx, 'due_date', e.target.value)}
                      className='text-xs h-8'
                    />
                  </div>

                  <div className='sm:col-span-3 space-y-1'>
                    <Label className='text-[11px]'>Estado</Label>
                    <Select
                      value={pm.status || 'PENDIENTE'}
                      onValueChange={(val) => handlePaymentChange(idx, 'status', val)}
                    >
                      <SelectTrigger className='text-xs h-8'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='PENDIENTE'>Pendiente</SelectItem>
                        <SelectItem value='PAGADO'>Pagado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scheduleType === 'custom' && payments.length > 1 ? (
                    <div className='sm:col-span-1 flex justify-end pt-2 sm:pt-0'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='xs'
                        onClick={() => handleRemovePayment(idx)}
                        className='text-destructive hover:text-destructive cursor-pointer h-7 w-7 p-0'
                      >
                        <Icons.trash className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SECCIÓN 3: CREDENCIALES Y ACCESOS */}
        <Card className='border-border/60 bg-card/60 backdrop-blur-sm'>
          <CardHeader className='flex flex-row items-center justify-between pb-3'>
            <div>
              <CardTitle className='text-base font-bold flex items-center gap-2'>
                <Icons.lock className='h-4 w-4 text-primary' />
                Credenciales de Acceso para el Cliente
              </CardTitle>
              <CardDescription>
                Se mostrarán de forma segura al cliente una vez firmado el contrato
              </CardDescription>
            </div>
            <Button
              type='button'
              onClick={handleAddCredential}
              variant='outline'
              size='sm'
              className='cursor-pointer text-xs'
            >
              <Icons.add className='h-3.5 w-3.5 mr-1' />
              Añadir Acceso
            </Button>
          </CardHeader>
          <CardContent className='space-y-3'>
            {credentials.length === 0 ? (
              <div className='p-6 text-center border border-dashed border-border/60 rounded-lg bg-muted/10'>
                <Icons.lock className='h-8 w-8 mx-auto text-muted-foreground/40 mb-2' />
                <p className='text-xs text-muted-foreground max-w-sm mx-auto'>
                  No hay credenciales registradas. Si este proyecto requiere accesos confidenciales
                  (CPanel, CMS, etc.), agrégalos aquí.
                </p>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleAddCredential}
                  className='mt-3 text-xs cursor-pointer'
                >
                  <Icons.add className='h-3.5 w-3.5 mr-1' />
                  Añadir Acceso
                </Button>
              </div>
            ) : (
              credentials.map((cred, idx) => (
                <div
                  key={idx}
                  className='grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-lg border border-border/40 bg-background/40 items-center'
                >
                  <div className='space-y-1'>
                    <Label className='text-[11px]'>Servicio / Acceso</Label>
                    <Input
                      placeholder='Ej: WordPress Admin / CPanel'
                      value={cred.description}
                      onChange={(e) => handleCredentialChange(idx, 'description', e.target.value)}
                      className='text-xs h-8'
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[11px]'>Usuario / Correo</Label>
                    <Input
                      placeholder='admin@empresa.com'
                      value={cred.email}
                      onChange={(e) => handleCredentialChange(idx, 'email', e.target.value)}
                      className='text-xs h-8'
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-[11px]'>Contraseña</Label>
                    <Input
                      placeholder='••••••••'
                      value={cred.password}
                      onChange={(e) => handleCredentialChange(idx, 'password', e.target.value)}
                      className='text-xs h-8 font-mono'
                    />
                  </div>
                  <div className='flex items-end justify-between gap-2 pt-2 sm:pt-0'>
                    <div className='flex-1 space-y-1'>
                      <Label className='text-[11px]'>Notas</Label>
                      <Input
                        placeholder='URL de acceso u observaciones'
                        value={cred.notes || ''}
                        onChange={(e) => handleCredentialChange(idx, 'notes', e.target.value)}
                        className='text-xs h-8'
                      />
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => handleRemoveCredential(idx)}
                      className='h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer'
                      title='Eliminar acceso'
                    >
                      <Icons.trash className='h-3.5 w-3.5' />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* SUBMIT BUTTONS */}
        <div className='flex items-center justify-between pt-4 border-t border-border/40'>
          <a
            href={`/p/${proposal.id}`}
            target='_blank'
            rel='noreferrer'
            className='text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5'
          >
            <Icons.externalLink className='h-3.5 w-3.5' />
            <span>Ver portal interactivo actual</span>
          </a>

          <div className='flex items-center gap-3'>
            <Link href='/dashboard'>
              <Button type='button' variant='outline' className='cursor-pointer'>
                Cancelar
              </Button>
            </Link>
            <Button
              type='submit'
              disabled={isPending}
              className='bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 cursor-pointer shadow-lg'
            >
              {isPending ? 'Guardando Cambios...' : 'Guardar Cambios de la Propuesta'}
            </Button>
          </div>
        </div>
      </form>

      {/* MODAL DE CONFIRMACIÓN: RESET DE FIRMA (OPCIÓN B) */}
      <Dialog open={confirmSignResetModalOpen} onOpenChange={setConfirmSignResetModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-amber-600 dark:text-amber-400'>
              <Icons.warning className='h-5 w-5' />
              <span>Confirmar Actualización y Reseteo de Firma</span>
            </DialogTitle>
            <DialogDescription className='pt-2 text-xs leading-relaxed'>
              Este contrato fue firmado digitalmente por{' '}
              <strong>
                {proposal.client_name} ({proposal.client_company})
              </strong>
              .
              <br />
              <br />
              Al guardar los cambios realizados, <strong>
                la firma previa quedará invalidada
              </strong>{' '}
              para que el cliente pueda revisar y volver a firmar digitalmente los nuevos términos y
              montos acordados en su portal.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setConfirmSignResetModalOpen(false)}
            >
              Volver a Revisar
            </Button>
            <Button
              type='button'
              disabled={isPending}
              onClick={() => {
                setConfirmSignResetModalOpen(false);
                executeUpdate();
              }}
              className='bg-amber-600 hover:bg-amber-700 text-white font-bold'
            >
              {isPending ? 'Guardando...' : 'Comprendido, Guardar y Resetear Firma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
