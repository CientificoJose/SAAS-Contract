'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createProposal,
  getCatalog,
  uploadAsset
} from '@/lib/actions';
import type {
  CatalogCategory,
  Credential,
  ProposalService,
  ProposalCollaborator,
  ProposalPayment
} from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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

export default function CrearPropuestaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);

  // Cliente
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientDomain, setClientDomain] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`FAC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [paymentStatus, setPaymentStatus] = useState('PENDIENTE');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');

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
      const { url } = await uploadAsset(formData);
      setBrandLogoUrl(url);
      toast.success('Logo subido a Supabase Storage con éxito');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir archivo a Supabase Storage');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Servicios
  const [services, setServices] = useState<ServiceFormState[]>([]);

  // Credenciales
  const [credentials, setCredentials] = useState<Credential[]>([
    { description: 'Panel de Administración', email: '', password: '', notes: '' }
  ]);
  const [showCredentials, setShowCredentials] = useState(true);

  // Colaboradores
  const [collaborators, setCollaborators] = useState<ProposalCollaborator[]>([]);

  // Pagos / Cuotas
  const [payments, setPayments] = useState<ProposalPayment[]>([
    { description: 'Pago Inicial / Contrato', amount: 0, status: 'PENDIENTE', payment_date: new Date().toISOString().split('T')[0], payment_method: 'Transferencia' }
  ]);

  // Cargar catálogo
  useEffect(() => {
    getCatalog().then((cats) => {
      setCatalog(cats);
      // Inicializar con el primer servicio disponible
      if (cats.length > 0 && cats[0].services && cats[0].services.length > 0) {
        const cat = cats[0];
        const srv = cat.services![0];
        const plan = srv && srv.plans && srv.plans.length > 0 ? srv.plans[0] : null;

        const todayISO = new Date().toISOString().split('T')[0];
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const nextYearISO = nextYear.toISOString().split('T')[0];

        setServices([
          {
            category_id: cat.id,
            service_id: srv.id,
            plan_id: plan ? plan.id : '',
            category_name: cat.name,
            service_name: srv.name,
            plan_name: plan ? plan.name : 'Personalizado',
            price: plan ? plan.price.toString() : '0',
            billing_type: 'RECURRENT',
            billing_cycle: plan?.duration || '1 año',
            features: plan?.features || '',
            policies: plan?.policies || cat.policies || '',
            start_date: todayISO,
            expiration_date: nextYearISO,
            domain_included: false,
            domain_expiration: ''
          }
        ]);
      }
    });
  }, []);

  // Sincronizar monto del primer pago con la suma total
  const totalPrice = services.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);

  useEffect(() => {
    if (payments.length === 1 && payments[0].amount !== totalPrice) {
      setPayments([{ ...payments[0], amount: totalPrice }]);
    }
  }, [totalPrice, payments]);

  // Handlers para Servicios
  const handleAddService = () => {
    if (catalog.length === 0) return;
    const cat = catalog[0];
    const srv = cat.services && cat.services.length > 0 ? cat.services[0] : null;
    const plan = srv && srv.plans && srv.plans.length > 0 ? srv.plans[0] : null;

    const todayISO = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearISO = nextYear.toISOString().split('T')[0];

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
        billing_type: 'RECURRENT',
        billing_cycle: plan?.duration || '1 año',
        features: plan?.features || '',
        policies: plan?.policies || cat.policies || '',
        start_date: todayISO,
        expiration_date: nextYearISO,
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
            updated[index].plan_id = firstPlan.id;
            updated[index].plan_name = firstPlan.name;
            updated[index].price = firstPlan.price.toString();
            updated[index].billing_cycle = firstPlan.duration || '1 año';
            updated[index].features = firstPlan.features || '';
            updated[index].policies = firstPlan.policies || cat.policies || '';
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
          updated[index].plan_id = firstPlan.id;
          updated[index].plan_name = firstPlan.name;
          updated[index].price = firstPlan.price.toString();
          updated[index].billing_cycle = firstPlan.duration || '1 año';
          updated[index].features = firstPlan.features || '';
          updated[index].policies = firstPlan.policies || cat?.policies || '';
        }
      }
    }

    // Si cambia plan
    if (field === 'plan_id') {
      const cat = catalog.find((c) => c.id === updated[index].category_id);
      const srv = cat?.services?.find((s) => s.id === updated[index].service_id);
      const plan = srv?.plans?.find((p) => p.id === value);
      if (plan) {
        updated[index].plan_name = plan.name;
        updated[index].price = plan.price.toString();
        updated[index].billing_cycle = plan.duration || '1 año';
        updated[index].features = plan.features || '';
        updated[index].policies = plan.policies || cat?.policies || '';
      }
    }

    setServices(updated);
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

    const validCredentials = credentials.filter((c) => c.description.trim() || c.email.trim());

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
          payment_amount: paymentStatus === 'PAGADO' ? totalPrice : 0,
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
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Link href='/dashboard'>
            <Button variant='ghost' size='sm' className='cursor-pointer text-muted-foreground hover:text-foreground'>
              <Icons.chevronLeft className='h-4 w-4 mr-1' />
              Volver
            </Button>
          </Link>
          <h1 className='text-2xl font-bold tracking-tight'>Crear Nueva Propuesta Comercial</h1>
        </div>
        <div className='text-right'>
          <span className='text-xs text-muted-foreground'>Total Estimado</span>
          <div className='text-xl font-bold text-primary'>${totalPrice.toLocaleString()} USD</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* SECCIÓN 1: DATOS DEL CLIENTE Y FACTURA */}
        <Card className='border-border/60 bg-card/60 backdrop-blur-sm'>
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
                <Label htmlFor='paymentMethod'>Método de Pago Sugerido</Label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val || 'Transferencia')}>
                  <SelectTrigger id='paymentMethod'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Transferencia'>Transferencia Bancaria</SelectItem>
                    <SelectItem value='Binance'>Binance Pay (USDT)</SelectItem>
                    <SelectItem value='Zelle'>Zelle</SelectItem>
                    <SelectItem value='Tarjeta'>Tarjeta de Crédito / Débito</SelectItem>
                    <SelectItem value='Efectivo'>Efectivo / Divisas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='paymentStatus'>Estado Inicial del Pago</Label>
                <Select value={paymentStatus} onValueChange={(val) => setPaymentStatus(val || 'PENDIENTE')}>
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
        <Card className='border-border/60 bg-card/60 backdrop-blur-sm'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base font-bold flex items-center gap-2'>
              <Icons.palette className='h-4 w-4 text-blue-500' />
              Personalización de Marca y Logotipo (Opcional)
            </CardTitle>
            <CardDescription>
              Sube el logo del cliente o de la propuesta a Supabase Storage, o déjalo vacío para usar el logo predeterminado
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
                <Label htmlFor='brandColorPrimary' className='text-xs'>Color Primario (Acento / Botones)</Label>
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
                <Label htmlFor='brandColorSecondary' className='text-xs'>Color Secundario (Encabezados / Detalles)</Label>
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
                Selecciona del catálogo los servicios contratados y ajusta precios y vigencias
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

              return (
                <div
                  key={idx}
                  className='p-4 rounded-xl border border-border/50 bg-background/50 space-y-4 relative'
                >
                  <div className='flex items-center justify-between border-b border-border/30 pb-2'>
                    <Badge variant='outline' className='text-xs font-bold'>
                      Servicio #{idx + 1}
                    </Badge>
                    {services.length > 1 ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => handleRemoveService(idx)}
                        className='h-7 w-7 p-0 text-destructive hover:text-destructive cursor-pointer'
                      >
                        <Icons.trash className='h-3.5 w-3.5' />
                      </Button>
                    ) : null}
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                    {/* Categoría */}
                    <div className='space-y-1.5'>
                      <Label className='text-xs'>Categoría</Label>
                      <Select
                        value={srv.category_id}
                        onValueChange={(val) => handleServiceChange(idx, 'category_id', val)}
                      >
                        <SelectTrigger className='text-xs h-9'>
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

                    {/* Servicio */}
                    <div className='space-y-1.5'>
                      <Label className='text-xs'>Servicio</Label>
                      <Select
                        value={srv.service_id}
                        onValueChange={(val) => handleServiceChange(idx, 'service_id', val)}
                      >
                        <SelectTrigger className='text-xs h-9'>
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

                    {/* Plan */}
                    <div className='space-y-1.5'>
                      <Label className='text-xs'>Plan de Precios</Label>
                      <Select
                        value={srv.plan_id}
                        onValueChange={(val) => handleServiceChange(idx, 'plan_id', val)}
                      >
                        <SelectTrigger className='text-xs h-9'>
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

                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                    <div className='space-y-1.5'>
                      <Label className='text-xs'>Precio Acordado (USD)</Label>
                      <Input
                        type='number'
                        step='0.01'
                        required
                        value={srv.price}
                        onChange={(e) => handleServiceChange(idx, 'price', e.target.value)}
                        className='text-xs h-9 font-bold'
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <Label className='text-xs'>Fecha de Inicio</Label>
                      <Input
                        type='date'
                        value={srv.start_date}
                        onChange={(e) => handleServiceChange(idx, 'start_date', e.target.value)}
                        className='text-xs h-9'
                      />
                    </div>

                    <div className='space-y-1.5'>
                      <Label className='text-xs'>Fecha de Vencimiento</Label>
                      <Input
                        type='date'
                        value={srv.expiration_date}
                        onChange={(e) => handleServiceChange(idx, 'expiration_date', e.target.value)}
                        className='text-xs h-9'
                      />
                    </div>
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='text-xs'>Características Incluidas (una por línea)</Label>
                    <Textarea
                      rows={2}
                      value={srv.features}
                      onChange={(e) => handleServiceChange(idx, 'features', e.target.value)}
                      placeholder='Características del servicio...'
                      className='text-xs'
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* SECCIÓN 3: ACCESOS Y CREDENCIALES (PORTAL CLIENTE) */}
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
            {credentials.map((cred, idx) => (
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
                  {credentials.length > 1 ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => handleRemoveCredential(idx)}
                      className='h-8 w-8 p-0 text-destructive hover:text-destructive cursor-pointer'
                    >
                      <Icons.trash className='h-3.5 w-3.5' />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
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
