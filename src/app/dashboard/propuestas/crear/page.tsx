'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createProposal,
  getCatalog,
  uploadAsset,
  getSettings,
  getPaymentMethods
} from '@/lib/actions';
import type {
  CatalogCategory,
  Credential,
  ProposalService,
  ProposalCollaborator,
  ProposalPayment,
  PaymentMethodConfig
} from '@/lib/supabase/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
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
import { toast } from 'sonner';
import { Icons } from '@/components/icons';
import { useGuidedTour } from '@/hooks/use-guided-tour';

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
    // Default 1 año
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().split('T')[0];
}

export default function CrearPropuestaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { startCreatorTour } = useGuidedTour();
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);

  // Cliente
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientDomain, setClientDomain] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(
    `FAC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [paymentStatus, setPaymentStatus] = useState('PENDIENTE');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Transferencia Bancaria');
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethodConfig[]>([]);

  // Branding Custom
  const [brandColorPrimary, setBrandColorPrimary] = useState('');
  const [brandColorSecondary, setBrandColorSecondary] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

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
      toast.success('Logo subido a Supabase Storage con éxito');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir archivo a Supabase Storage');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Servicios
  const [services, setServices] = useState<ServiceFormState[]>([]);

  // Esquema de Cuotas Iniciales
  const [scheduleType, setScheduleType] = useState<'full' | '50_50' | 'custom'>('full');
  const [payments, setPayments] = useState<ProposalPayment[]>([
    {
      description: 'Pago Inicial / Contrato',
      amount: 0,
      status: 'PENDIENTE',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Transferencia',
      due_date: new Date().toISOString().split('T')[0]
    }
  ]);

  // Credenciales
  const [credentials, setCredentials] = useState<Credential[]>([]);

  // Colaboradores
  const [collaborators, setCollaborators] = useState<ProposalCollaborator[]>([]);

  // Cargar catálogo inicial
  useEffect(() => {
    getCatalog().then((cats) => {
      setCatalog(cats);
      if (cats.length > 0 && cats[0].services && cats[0].services.length > 0) {
        const cat = cats[0];
        const srv = cat.services![0];
        const plan = srv && srv.plans && srv.plans.length > 0 ? srv.plans[0] : null;

        const todayISO = new Date().toISOString().split('T')[0];
        const bType = detectBillingType(plan?.duration);
        const bCycle = bType === 'ONE_TIME' ? 'Pago Único' : plan?.duration || '1 año';
        const expDate = computeExpirationDate(todayISO, bType, bCycle);

        setServices([
          {
            category_id: cat.id,
            service_id: srv.id,
            plan_id: plan ? plan.id : '',
            category_name: cat.name,
            service_name: srv.name,
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
      }
    });
  }, []);

  // Prefill branding with current tenant settings
  useEffect(() => {
    getSettings()
      .then((st) => {
        if (st.brand_logo && st.brand_logo !== '/recurso.png') {
          setBrandLogoUrl(st.brand_logo);
        }
        if (st.color_primary) {
          setBrandColorPrimary(st.color_primary);
        }
        if (st.color_secondary) {
          setBrandColorSecondary(st.color_secondary);
        }
      })
      .catch((err) => {
        console.warn('Could not load tenant settings for proposal creation', err);
      });

    getPaymentMethods()
      .then((methods) => {
        setPaymentMethodsList(methods);
        const firstEnabled = methods.find((m) => m.enabled);
        if (firstEnabled) {
          setPaymentMethod(firstEnabled.name);
        }
      })
      .catch((err) => {
        console.warn('Could not load payment methods for proposal creation', err);
      });
  }, []);

  // Cálculos financieros
  const totalPrice = services.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
  const oneTimeTotal = services
    .filter((s) => s.billing_type === 'ONE_TIME')
    .reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
  const recurrentTotal = services
    .filter((s) => s.billing_type === 'RECURRENT')
    .reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);

  // Sincronizar cuotas cuando cambia totalPrice o el esquema de pago
  useEffect(() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 15);
    const deliveryDateISO = deliveryDate.toISOString().split('T')[0];

    const initialStatus = paymentStatus === 'PAGADO' ? 'PAGADO' : 'PENDIENTE';

    if (scheduleType === 'full') {
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
    } else if (scheduleType === '50_50') {
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
  }, [totalPrice, scheduleType, paymentMethod, paymentStatus]);

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

    // Si cambia categoría, resetear servicio y plan
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
            const bType = detectBillingType(firstPlan.duration);
            const bCycle = bType === 'ONE_TIME' ? 'Pago Único' : firstPlan.duration || '1 año';
            updated[index].plan_id = firstPlan.id;
            updated[index].plan_name = firstPlan.name;
            updated[index].price = firstPlan.price.toString();
            updated[index].billing_type = bType;
            updated[index].billing_cycle = bCycle;
            updated[index].features = firstPlan.features || '';
            updated[index].policies = firstPlan.policies || cat.policies || '';
            updated[index].expiration_date = computeExpirationDate(
              updated[index].start_date,
              bType,
              bCycle
            );
          }
        }
      }
    }

    // Si cambia servicio
    if (field === 'service_id') {
      const cat = catalog.find((c) => c.id === updated[index].category_id);
      const srv = cat?.services?.find((s) => s.id === value);
      if (srv) {
        updated[index].service_name = srv.name;
        const firstPlan = srv.plans && srv.plans.length > 0 ? srv.plans[0] : null;
        if (firstPlan) {
          const bType = detectBillingType(firstPlan.duration);
          const bCycle = bType === 'ONE_TIME' ? 'Pago Único' : firstPlan.duration || '1 año';
          updated[index].plan_id = firstPlan.id;
          updated[index].plan_name = firstPlan.name;
          updated[index].price = firstPlan.price.toString();
          updated[index].billing_type = bType;
          updated[index].billing_cycle = bCycle;
          updated[index].features = firstPlan.features || '';
          updated[index].policies = firstPlan.policies || cat?.policies || '';
          updated[index].expiration_date = computeExpirationDate(
            updated[index].start_date,
            bType,
            bCycle
          );
        }
      }
    }

    // Si cambia plan
    if (field === 'plan_id') {
      const cat = catalog.find((c) => c.id === updated[index].category_id);
      const srv = cat?.services?.find((s) => s.id === updated[index].service_id);
      const plan = srv?.plans?.find((p) => p.id === value);
      if (plan) {
        const bType = detectBillingType(plan.duration);
        const bCycle = bType === 'ONE_TIME' ? 'Pago Único' : plan.duration || '1 año';
        updated[index].plan_name = plan.name;
        updated[index].price = plan.price.toString();
        updated[index].billing_type = bType;
        updated[index].billing_cycle = bCycle;
        updated[index].features = plan.features || '';
        updated[index].policies = plan.policies || cat?.policies || '';
        updated[index].expiration_date = computeExpirationDate(
          updated[index].start_date,
          bType,
          bCycle
        );
      }
    }

    // Si cambia directamente la modalidad (billing_type)
    if (field === 'billing_type') {
      if (value === 'ONE_TIME') {
        updated[index].billing_cycle = 'Pago Único';
        updated[index].expiration_date = '';
      } else {
        if (updated[index].billing_cycle === 'Pago Único') {
          updated[index].billing_cycle = '1 mes';
        }
        updated[index].expiration_date = computeExpirationDate(
          updated[index].start_date,
          'RECURRENT',
          updated[index].billing_cycle
        );
      }
    }

    // Si cambia el ciclo de cobro recurrente
    if (field === 'billing_cycle') {
      if (updated[index].billing_type === 'RECURRENT') {
        updated[index].expiration_date = computeExpirationDate(
          updated[index].start_date,
          'RECURRENT',
          value
        );
      }
    }

    // Si cambia la fecha de inicio
    if (field === 'start_date') {
      if (updated[index].billing_type === 'RECURRENT') {
        updated[index].expiration_date = computeExpirationDate(
          value,
          'RECURRENT',
          updated[index].billing_cycle
        );
      }
    }

    setServices(updated);
  };

  // Handlers para Pagos / Cuotas manuales
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

  // Handlers para Credenciales
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

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !clientCompany.trim()) {
      toast.error('Por favor ingresa el nombre y empresa del cliente');
      return;
    }

    if (services.length === 0) {
      toast.error('Debes agregar al menos un servicio a la propuesta');
      return;
    }

    const proposalId = `prop-${Date.now()}`;

    const formattedServices: ProposalService[] = services.map((s, idx) => ({
      id: `${proposalId}-srv-${idx + 1}`,
      proposal_id: proposalId,
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
        await createProposal({
          id: proposalId,
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
          services: formattedServices,
          credentials: validCredentials,
          payments,
          collaborators
        });

        toast.success('¡Propuesta comercial creada exitosamente!');
        router.push('/dashboard');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al guardar la propuesta');
      }
    });
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
              Volver
            </Button>
          </Link>
          <div>
            <div className='flex items-center gap-2.5 flex-wrap'>
              <h1 className='text-2xl font-bold tracking-tight'>Crear Nueva Propuesta Comercial</h1>
              <Button
                type='button'
                variant='outline'
                size='xs'
                onClick={startCreatorTour}
                className='cursor-pointer text-xs flex items-center gap-1.5 border-primary/40 bg-primary/5 text-primary hover:bg-primary/15 transition-all shadow-xs'
                title='Iniciar Tour Guiado Interactivo'
              >
                <Icons.help className='h-3.5 w-3.5' />
                <span>Tour Guiado</span>
              </Button>
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              Define propuestas de pago único, servicios recurrentes o esquemas mixtos
            </p>
          </div>
        </div>

        {/* Breakdown financiero en tiempo real */}
        <div
          id='financial-header-summary'
          className='flex items-center gap-4 bg-muted/40 px-4 py-2 rounded-xl border border-border/50 text-right'
        >
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

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* SECCIÓN 1: DATOS DEL CLIENTE Y FACTURA */}
        <Card id='section-client-info' className='border-border/60 bg-card/60 backdrop-blur-sm'>
          <CardHeader>
            <CardTitle className='text-base font-bold flex items-center gap-2'>
              <Icons.user className='h-4 w-4 text-primary' />
              Información del Cliente y Contrato
            </CardTitle>
            <CardDescription>
              Datos del titular o empresa que contrata y detalles de facturación inicial
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
                  placeholder='Ej: lizspacenter.com'
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
                <div className='flex items-center justify-between'>
                  <Label htmlFor='paymentMethod'>Método de Pago Sugerido</Label>
                  <Link
                    href='/dashboard'
                    className='text-[10px] text-primary hover:underline'
                    target='_blank'
                  >
                    Gestionar métodos
                  </Link>
                </div>
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
                <Label htmlFor='paymentStatus'>Estado Inicial del Pago</Label>
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

        {/* SECCIÓN 1.5: BRANDING Y LOGO DE LA PROPUESTA (SUPABASE STORAGE) */}
        <Card
          id='section-proposal-branding'
          className='border-border/60 bg-card/60 backdrop-blur-sm'
        >
          <CardHeader className='pb-3'>
            <CardTitle className='text-base font-bold flex items-center gap-2'>
              <Icons.palette className='h-4 w-4 text-blue-500' />
              Personalización de Marca y Logotipo (Opcional)
            </CardTitle>
            <CardDescription>
              Sube el logo del cliente o de la propuesta a Supabase Storage, o déjalo vacío para
              usar el logo predeterminado
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='proposalLogoUpload' className='text-xs font-semibold'>
                  Logotipo para este Contrato (Supabase Storage)
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

        {/* SECCIÓN 2: SERVICIOS CONTRATADOS (MODALIDAD PAGO ÚNICO VS RECURRENTE) */}
        <Card id='section-services-list' className='border-border/60 bg-card/60 backdrop-blur-sm'>
          <CardHeader className='flex flex-row items-center justify-between pb-3'>
            <div>
              <CardTitle className='text-base font-bold flex items-center gap-2'>
                <Icons.folder className='h-4 w-4 text-primary' />
                Servicios y Planes Incluidos ({services.length})
              </CardTitle>
              <CardDescription>
                Define la naturaleza de cada servicio (Pago Único para entregables o Recurrente para
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
              Añadir Otro Servicio
            </Button>
          </CardHeader>
          <CardContent className='space-y-6'>
            {services.map((srv, idx) => {
              const currentCat = catalog.find((c) => c.id === srv.category_id);
              const currentServices = currentCat?.services || [];
              const currentSrv = currentServices.find((s) => s.id === srv.service_id);
              const currentPlans = currentSrv?.plans || [];
              const isOneTime = srv.billing_type === 'ONE_TIME';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all space-y-4 relative ${
                    isOneTime
                      ? 'border-blue-500/30 bg-blue-500/5'
                      : 'border-purple-500/30 bg-purple-500/5'
                  }`}
                >
                  <div className='flex items-center justify-between border-b border-border/30 pb-2.5'>
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline' className='text-xs font-bold'>
                        Servicio #{idx + 1}
                      </Badge>

                      {/* Selector de Modalidad */}
                      <div className='flex items-center bg-background/80 border border-border/60 rounded-lg p-0.5 shadow-xs'>
                        <button
                          type='button'
                          onClick={() => handleServiceChange(idx, 'billing_type', 'ONE_TIME')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${
                            isOneTime
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span>⚡ Pago Único (Proyecto)</span>
                        </button>
                        <button
                          type='button'
                          onClick={() => handleServiceChange(idx, 'billing_type', 'RECURRENT')}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${
                            !isOneTime
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span>🔄 Recurrente (Suscripción)</span>
                        </button>
                      </div>
                    </div>

                    {services.length > 1 ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => handleRemoveService(idx)}
                        className='h-7 w-7 p-0 text-destructive hover:text-destructive cursor-pointer'
                        title='Eliminar servicio'
                      >
                        <Icons.trash className='h-3.5 w-3.5' />
                      </Button>
                    ) : null}
                  </div>

                  {/* Fila 1: Catálogo */}
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                    <div className='space-y-1.5'>
                      <Label className='text-xs font-semibold'>Categoría</Label>
                      <Select
                        value={srv.category_id}
                        onValueChange={(val) => handleServiceChange(idx, 'category_id', val)}
                      >
                        <SelectTrigger className='text-xs h-9 bg-background'>
                          <SelectValue placeholder='Categoría' />
                        </SelectTrigger>
                        <SelectContent>
                          {catalog.map((c) => (
                            <SelectItem key={c.id} value={c.id} className='text-xs'>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-1.5'>
                      <Label className='text-xs font-semibold'>Servicio</Label>
                      <Select
                        value={srv.service_id}
                        onValueChange={(val) => handleServiceChange(idx, 'service_id', val)}
                      >
                        <SelectTrigger className='text-xs h-9 bg-background'>
                          <SelectValue placeholder='Servicio' />
                        </SelectTrigger>
                        <SelectContent>
                          {currentServices.map((s) => (
                            <SelectItem key={s.id} value={s.id} className='text-xs'>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-1.5'>
                      <Label className='text-xs font-semibold'>Plan del Catálogo</Label>
                      <Select
                        value={srv.plan_id}
                        onValueChange={(val) => handleServiceChange(idx, 'plan_id', val)}
                      >
                        <SelectTrigger className='text-xs h-9 bg-background'>
                          <SelectValue placeholder='Plan' />
                        </SelectTrigger>
                        <SelectContent>
                          {currentPlans.map((p) => (
                            <SelectItem key={p.id} value={p.id} className='text-xs'>
                              {p.name} (${p.price} / {p.duration})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Fila 2: Tarifas y Vigencias según modalidad */}
                  {isOneTime ? (
                    <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20'>
                      <div className='space-y-1.5'>
                        <Label className='text-xs font-semibold text-blue-900 dark:text-blue-200'>
                          Precio del Proyecto (USD)
                        </Label>
                        <Input
                          type='number'
                          step='0.01'
                          required
                          value={srv.price}
                          onChange={(e) => handleServiceChange(idx, 'price', e.target.value)}
                          className='text-xs h-9 font-bold bg-background'
                          placeholder='0.00'
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <Label className='text-xs font-semibold text-blue-900 dark:text-blue-200'>
                          Fecha de Inicio / Contratación
                        </Label>
                        <Input
                          type='date'
                          value={srv.start_date}
                          onChange={(e) => handleServiceChange(idx, 'start_date', e.target.value)}
                          className='text-xs h-9 bg-background'
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <Label className='text-xs font-semibold text-muted-foreground'>
                          Modalidad
                        </Label>
                        <div className='h-9 px-3 rounded-md border border-border/60 bg-background flex items-center text-xs font-bold text-blue-600'>
                          Pago Único (Sin vencimiento)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20'>
                      <div className='space-y-1.5'>
                        <Label className='text-xs font-semibold text-purple-900 dark:text-purple-200'>
                          Tarifa Recurrente (USD)
                        </Label>
                        <Input
                          type='number'
                          step='0.01'
                          required
                          value={srv.price}
                          onChange={(e) => handleServiceChange(idx, 'price', e.target.value)}
                          className='text-xs h-9 font-bold bg-background'
                          placeholder='0.00'
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <Label className='text-xs font-semibold text-purple-900 dark:text-purple-200'>
                          Ciclo de Renovación
                        </Label>
                        <Select
                          value={srv.billing_cycle}
                          onValueChange={(val) => handleServiceChange(idx, 'billing_cycle', val)}
                        >
                          <SelectTrigger className='text-xs h-9 bg-background'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='1 mes'>Mensual (cada 1 mes)</SelectItem>
                            <SelectItem value='3 meses'>Trimestral (cada 3 meses)</SelectItem>
                            <SelectItem value='6 meses'>Semestral (cada 6 meses)</SelectItem>
                            <SelectItem value='1 año'>Anual (cada 1 año)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className='space-y-1.5'>
                        <Label className='text-xs font-semibold text-purple-900 dark:text-purple-200'>
                          Inicio del Periodo
                        </Label>
                        <Input
                          type='date'
                          value={srv.start_date}
                          onChange={(e) => handleServiceChange(idx, 'start_date', e.target.value)}
                          className='text-xs h-9 bg-background'
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <Label className='text-xs font-semibold text-purple-900 dark:text-purple-200'>
                          Próxima Renovación
                        </Label>
                        <Input
                          type='date'
                          value={srv.expiration_date}
                          onChange={(e) =>
                            handleServiceChange(idx, 'expiration_date', e.target.value)
                          }
                          className='text-xs h-9 bg-background font-bold text-purple-600'
                        />
                      </div>
                    </div>
                  )}

                  {/* Nota explicativa de la modalidad */}
                  <div className='text-[11px] text-muted-foreground flex items-center gap-1.5'>
                    <Icons.info className='h-3.5 w-3.5 shrink-0 text-muted-foreground/70' />
                    <span>
                      {isOneTime
                        ? 'Este servicio es de pago único. Al firmarse y cobrarse el proyecto, quedará formalizado y no generará avisos de renovación periódica.'
                        : `Este servicio renovará cada ${srv.billing_cycle}. Al vencer la fecha, el portal activará automáticamente el aviso de cobro.`}
                    </span>
                  </div>

                  {/* Características */}
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>
                      Características y Alcance Incluido (una por línea)
                    </Label>
                    <Textarea
                      rows={2}
                      value={srv.features}
                      onChange={(e) => handleServiceChange(idx, 'features', e.target.value)}
                      placeholder='Características del servicio...'
                      className='text-xs bg-background'
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* SECCIÓN 2.5: ESQUEMA DE COBRO INICIAL Y CUOTAS */}
        <Card
          id='section-payment-schedule'
          className='border-border/60 bg-card/60 backdrop-blur-sm'
        >
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='text-base font-bold flex items-center gap-2'>
                  <Icons.creditCard className='h-4 w-4 text-emerald-500' />
                  Esquema de Cobro Inicial (Cronograma de Cuotas)
                </CardTitle>
                <CardDescription>
                  Define si el contrato se cobra en 1 pago total o en cuotas (ej: anticipo 50% y
                  entrega 50%)
                </CardDescription>
              </div>

              {scheduleType === 'custom' && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleAddPayment}
                  className='text-xs cursor-pointer'
                >
                  <Icons.add className='h-3.5 w-3.5 mr-1' />
                  Añadir Cuota
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Opciones de esquema */}
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              <button
                type='button'
                onClick={() => setScheduleType('full')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  scheduleType === 'full'
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-border/60 bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <div className='font-bold text-xs flex items-center justify-between'>
                  <span>100% al Inicio</span>
                  {scheduleType === 'full' && <Icons.check className='h-3.5 w-3.5 text-primary' />}
                </div>
                <p className='text-[11px] text-muted-foreground mt-1'>
                  Una única cuota inicial por el monto total (${totalPrice} USD)
                </p>
              </button>

              <button
                type='button'
                onClick={() => setScheduleType('50_50')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  scheduleType === '50_50'
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-border/60 bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <div className='font-bold text-xs flex items-center justify-between'>
                  <span>50% Anticipo / 50% Entrega</span>
                  {scheduleType === '50_50' && <Icons.check className='h-3.5 w-3.5 text-primary' />}
                </div>
                <p className='text-[11px] text-muted-foreground mt-1'>
                  2 cuotas automáticas de ${(totalPrice / 2).toFixed(2)} USD cada una
                </p>
              </button>

              <button
                type='button'
                onClick={() => setScheduleType('custom')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  scheduleType === 'custom'
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-border/60 bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <div className='font-bold text-xs flex items-center justify-between'>
                  <span>Personalizado</span>
                  {scheduleType === 'custom' && (
                    <Icons.check className='h-3.5 w-3.5 text-primary' />
                  )}
                </div>
                <p className='text-[11px] text-muted-foreground mt-1'>
                  Crea cuotas manuales con montos y fechas específicas
                </p>
              </button>
            </div>

            {/* Listado de cuotas */}
            <div className='space-y-2 pt-2'>
              {payments.map((pm, idx) => (
                <div
                  key={idx}
                  className='p-3 rounded-lg border border-border/50 bg-background/50 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs'
                >
                  <div className='sm:col-span-5 space-y-1'>
                    <Label className='text-[11px] font-semibold'>Concepto de la Cuota</Label>
                    <Input
                      value={pm.description || ''}
                      onChange={(e) => handlePaymentChange(idx, 'description', e.target.value)}
                      className='h-8 text-xs'
                      placeholder='Ej: Anticipo 50%'
                    />
                  </div>

                  <div className='sm:col-span-3 space-y-1'>
                    <Label className='text-[11px] font-semibold'>Monto (USD)</Label>
                    <Input
                      type='number'
                      step='0.01'
                      value={pm.amount || 0}
                      onChange={(e) =>
                        handlePaymentChange(idx, 'amount', parseFloat(e.target.value) || 0)
                      }
                      className='h-8 text-xs font-bold'
                    />
                  </div>

                  <div className='sm:col-span-3 space-y-1'>
                    <Label className='text-[11px] font-semibold'>Fecha Límite</Label>
                    <Input
                      type='date'
                      value={pm.due_date || ''}
                      onChange={(e) => handlePaymentChange(idx, 'due_date', e.target.value)}
                      className='h-8 text-xs'
                    />
                  </div>

                  {scheduleType === 'custom' && payments.length > 1 ? (
                    <div className='sm:col-span-1 flex justify-end pt-4 sm:pt-0'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => handleRemovePayment(idx)}
                        className='h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer'
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

        {/* SECCIÓN 3: ACCESOS Y CREDENCIALES (PORTAL CLIENTE) */}
        <Card id='section-credentials' className='border-border/60 bg-card/60 backdrop-blur-sm'>
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
                  No hay credenciales añadidas aún. Si este proyecto requiere accesos confidenciales
                  para el cliente (CPanel, CMS, etc.), puedes agregarlos aquí.
                </p>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleAddCredential}
                  className='mt-3 text-xs cursor-pointer'
                >
                  <Icons.add className='h-3.5 w-3.5 mr-1' />
                  Añadir Primer Acceso
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

        {/* Submit */}
        <div className='flex justify-end gap-3 pt-4 border-t border-border/40'>
          <Link href='/dashboard'>
            <Button type='button' variant='outline' className='cursor-pointer'>
              Cancelar
            </Button>
          </Link>
          <Button
            id='btn-submit-proposal'
            type='submit'
            disabled={isPending}
            className='bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 cursor-pointer shadow-lg'
          >
            {isPending ? 'Creando Propuesta...' : 'Generar Propuesta y Enlace Digital'}
          </Button>
        </div>
      </form>
    </div>
  );
}
