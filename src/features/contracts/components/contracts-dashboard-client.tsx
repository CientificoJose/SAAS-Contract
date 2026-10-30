'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  deleteProposal,
  createCategory,
  deleteCategory,
  updateCategory,
  createService,
  updateService,
  deleteService,
  createServicePlan,
  updateServicePlan,
  deleteServicePlan,
  updateSettings,
  registerPayment,
  generateRenewalPeriod,
  sendTestEmail,
  sendProposalEmail,
  getProposalById,
  uploadAsset,
  savePaymentMethods
} from '@/lib/actions';
import { DEFAULT_PAYMENT_METHODS } from '@/lib/constants/payment-methods';
import type {
  Proposal,
  ProposalService,
  CatalogCategory,
  Credential,
  ProposalPayment,
  ProposalCollaborator,
  PaymentMethodConfig
} from '@/lib/supabase/types';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface ContractsDashboardClientProps {
  initialProposals: (Proposal & { services?: ProposalService[] })[];
  initialCatalog: CatalogCategory[];
  initialSettings: Record<string, string>;
  initialPaymentMethods?: PaymentMethodConfig[];
  userRole?: string;
}

export function ContractsDashboardClient({
  initialProposals,
  initialCatalog,
  initialSettings,
  initialPaymentMethods,
  userRole = 'admin'
}: ContractsDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState('propuestas');
  const [proposals, setProposals] = useState(initialProposals);
  const [catalog, setCatalog] = useState(initialCatalog);

  // Settings state
  const [settings, setSettings] = useState(initialSettings);
  const [brandName, setBrandName] = useState(initialSettings.brand_name || 'ContractCloud');
  const [brandLogo, setBrandLogo] = useState(initialSettings.brand_logo || 'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg');
  const [colorPrim, setColorPrim] = useState(initialSettings.color_primary || '#0066FF');
  const [colorSec, setColorSec] = useState(initialSettings.color_secondary || '#00F0FF');
  const [smtpHost, setSmtpHost] = useState(initialSettings.smtp_host || 'mail.press-cloud.com');
  const [smtpPort, setSmtpPort] = useState(initialSettings.smtp_port || '465');
  const [smtpUser, setSmtpUser] = useState(initialSettings.smtp_user || 'contract@press-cloud.com');
  const [smtpPass, setSmtpPass] = useState(initialSettings.smtp_pass || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Test Email state
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Send Proposal Email Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedProposalForEmail, setSelectedProposalForEmail] = useState<Proposal | null>(null);
  const [proposalRecipientEmail, setProposalRecipientEmail] = useState('');
  const [isSendingProposal, setIsSendingProposal] = useState(false);

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedProposalForPayment, setSelectedProposalForPayment] = useState<Proposal | null>(null);
  const [selectedPaymentIdForPayment, setSelectedPaymentIdForPayment] = useState<string | undefined>(undefined);
  const [paymentNewExpirationDate, setPaymentNewExpirationDate] = useState<string | undefined>(undefined);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');

  // Renewal Modal
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [selectedProposalForRenewal, setSelectedProposalForRenewal] = useState<Proposal | null>(null);
  const [renewalStartDate, setRenewalStartDate] = useState('');
  const [renewalEndDate, setRenewalEndDate] = useState('');
  const [renewalDueDate, setRenewalDueDate] = useState('');
  const [renewalAmount, setRenewalAmount] = useState('');
  const [renewalDesc, setRenewalDesc] = useState('');
  const [renewalNotifyClient, setRenewalNotifyClient] = useState(true);
  const [isSubmittingRenewal, setIsSubmittingRenewal] = useState(false);

  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailedProposal, setDetailedProposal] = useState<{
    proposal: Proposal | null;
    credentials: Credential[];
    services: ProposalService[];
    payments: ProposalPayment[];
    collaborators: ProposalCollaborator[];
  } | null>(null);

  // Category Edit / Create Modals
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatPolicies, setNewCatPolicies] = useState('');

  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editCatId, setEditCatId] = useState('');
  const [editCatName, setEditCatName] = useState('');
  const [editCatPolicies, setEditCatPolicies] = useState('');

  // Service Edit / Create Modals
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [newSerCatId, setNewSerCatId] = useState('');
  const [newSerName, setNewSerName] = useState('');

  const [editServiceOpen, setEditServiceOpen] = useState(false);
  const [editSerId, setEditSerId] = useState('');
  const [editSerCatId, setEditSerCatId] = useState('');
  const [editSerName, setEditSerName] = useState('');

  // Plan Edit / Create Modals
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [newPlanSerId, setNewPlanSerId] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newPlanDuration, setNewPlanDuration] = useState('1 año');
  const [newPlanFeatures, setNewPlanFeatures] = useState('');
  const [newPlanPolicies, setNewPlanPolicies] = useState('');

  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [editPlanId, setEditPlanId] = useState('');
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanPrice, setEditPlanPrice] = useState('');
  const [editPlanDuration, setEditPlanDuration] = useState('');
  const [editPlanFeatures, setEditPlanFeatures] = useState('');
  const [editPlanPolicies, setEditPlanPolicies] = useState('');

  // Payment Methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(
    initialPaymentMethods && initialPaymentMethods.length > 0
      ? initialPaymentMethods
      : DEFAULT_PAYMENT_METHODS
  );
  const [selectedMethodForEdit, setSelectedMethodForEdit] = useState<PaymentMethodConfig | null>(null);
  const [editMethodModalOpen, setEditMethodModalOpen] = useState(false);
  const [createMethodModalOpen, setCreateMethodModalOpen] = useState(false);

  // New Custom Method Form State
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState<'zelle' | 'binance' | 'bank_transfer' | 'custom'>('custom');
  const [newMethodLogo, setNewMethodLogo] = useState('/logos/bank.svg');
  const [newMethodHolder, setNewMethodHolder] = useState('');
  const [newMethodEmail, setNewMethodEmail] = useState('');
  const [newMethodBinanceId, setNewMethodBinanceId] = useState('');
  const [newMethodWallet, setNewMethodWallet] = useState('');
  const [newMethodNetwork, setNewMethodNetwork] = useState('USDT (Red TRC-20)');
  const [newMethodBank, setNewMethodBank] = useState('');
  const [newMethodAccount, setNewMethodAccount] = useState('');
  const [newMethodRouting, setNewMethodRouting] = useState('');
  const [newMethodInstructions, setNewMethodInstructions] = useState('');
  const [isUploadingMethodLogo, setIsUploadingMethodLogo] = useState(false);

  // Sincronizar props
  React.useEffect(() => {
    setProposals(initialProposals);
    setCatalog(initialCatalog);
    setSettings(initialSettings);
  }, [initialProposals, initialCatalog, initialSettings]);

  // ==========================================
  // HANDLERS: PROPOSALS
  // ==========================================

  const handleDeleteProposal = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta propuesta y todos sus registros?')) {
      startTransition(async () => {
        try {
          await deleteProposal(id);
          toast.success('Propuesta eliminada correctamente');
          router.refresh();
        } catch {
          toast.error('Error al eliminar la propuesta');
        }
      });
    }
  };

  const handleOpenPaymentModal = (prop: Proposal) => {
    setSelectedProposalForPayment(prop);
    setSelectedPaymentIdForPayment(undefined);
    setPaymentNewExpirationDate(undefined);
    const remaining = Math.max(0, (Number(prop.price) || 0) - (Number(prop.payment_amount) || 0));
    setPaymentAmount(remaining > 0 ? remaining.toString() : '');
    setPaymentDesc(`Abono cuota - ${prop.client_company}`);
    setPaymentModalOpen(true);
  };

  const handleOpenPaymentModalForCuota = (prop: Proposal, payment: ProposalPayment) => {
    setSelectedProposalForPayment(prop);
    setSelectedPaymentIdForPayment(payment.id);
    setPaymentAmount(payment.amount ? payment.amount.toString() : '');
    setPaymentDesc(payment.description || `Pago cuota - ${prop.client_company}`);

    // If the payment description has an end date like "al 2026-12-05", extract it
    let newExp = payment.due_date;
    const match = payment.description?.match(/al\s+(\d{4}-\d{2}-\d{2})/);
    if (match) {
      newExp = match[1];
    }
    setPaymentNewExpirationDate(newExp);
    setPaymentModalOpen(true);
  };

  const handleRegisterPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposalForPayment || !paymentAmount) return;

    startTransition(async () => {
      try {
        await registerPayment({
          proposal_id: selectedProposalForPayment.id,
          amount: parseFloat(paymentAmount) || 0,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          description: paymentDesc,
          notes: paymentNotes,
          payment_id: selectedPaymentIdForPayment,
          new_expiration_date: paymentNewExpirationDate
        });
        toast.success(
          paymentNewExpirationDate
            ? 'Pago registrado y vigencia del servicio extendida con éxito'
            : 'Pago registrado exitosamente'
        );
        setPaymentModalOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al registrar el pago');
      }
    });
  };

  const handleOpenRenewalModal = (prop: Proposal) => {
    setSelectedProposalForRenewal(prop);

    // Determine start date from current expiration or start date
    const currentExp = prop.service_expiration || prop.start_date || new Date().toISOString().split('T')[0];
    const startDate = currentExp.split('T')[0];

    // Determine cycle and amount from recurrent services if present
    const recurrentServices = prop.services?.filter((s) => s.billing_type === 'RECURRENT') || [];
    const firstRecurrent = recurrentServices[0];
    const cycle = (firstRecurrent?.billing_cycle || prop.duration || '').toLowerCase();

    const d = new Date(startDate);
    if (cycle.includes('año') || cycle.includes('year') || cycle.includes('anual')) {
      d.setFullYear(d.getFullYear() + 1);
    } else if (cycle.includes('trimest') || cycle.includes('quarter') || cycle.includes('3')) {
      d.setMonth(d.getMonth() + 3);
    } else if (cycle.includes('semest') || cycle.includes('6')) {
      d.setMonth(d.getMonth() + 6);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    const endDate = d.toISOString().split('T')[0];

    const recurrentAmount =
      recurrentServices.length > 0
        ? recurrentServices.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0)
        : Number(prop.price) || 0;

    const cycleLabel = firstRecurrent?.billing_cycle || prop.duration || 'Periodo';

    setRenewalStartDate(startDate);
    setRenewalEndDate(endDate);
    setRenewalDueDate(startDate);
    setRenewalAmount(recurrentAmount.toString());
    setRenewalDesc(`Renovación (${cycleLabel}): ${startDate} al ${endDate}`);
    setRenewalNotifyClient(true);
    setRenewalModalOpen(true);
  };

  const handleGenerateRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposalForRenewal || !renewalAmount) return;

    setIsSubmittingRenewal(true);
    try {
      const res = await generateRenewalPeriod({
        proposal_id: selectedProposalForRenewal.id,
        amount: parseFloat(renewalAmount) || 0,
        start_date: renewalStartDate,
        end_date: renewalEndDate,
        due_date: renewalDueDate,
        description: renewalDesc,
        notify_client: renewalNotifyClient,
        client_email: selectedProposalForRenewal.client_email
      });

      if (!res.success) {
        toast.error(res.error || 'Error al generar periodo de renovación');
      } else {
        toast.success(
          renewalNotifyClient
            ? 'Cuota de renovación generada y cliente notificado por correo'
            : 'Cuota de renovación generada exitosamente'
        );
        setRenewalModalOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al generar periodo de renovación');
    } finally {
      setIsSubmittingRenewal(false);
    }
  };

  const handleOpenDetails = async (propId: string) => {
    setDetailLoading(true);
    setDetailsModalOpen(true);
    try {
      const data = await getProposalById(propId);
      setDetailedProposal(data);
    } catch {
      toast.error('Error al cargar detalles de la propuesta');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenEmailModal = (prop: Proposal) => {
    setSelectedProposalForEmail(prop);
    setProposalRecipientEmail(prop.client_email || '');
    setEmailModalOpen(true);
  };

  const handleSendProposalEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposalForEmail || !proposalRecipientEmail) return;

    setIsSendingProposal(true);
    try {
      const res = await sendProposalEmail(selectedProposalForEmail.id, proposalRecipientEmail);
      if (!res.success) {
        toast.error(res.error || 'Error al enviar por correo');
      } else {
        toast.success('Propuesta enviada por correo al cliente');
        setEmailModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar por correo');
    } finally {
      setIsSendingProposal(false);
    }
  };

  const copyPublicLink = (id: string) => {
    const url = `${window.location.origin}/p/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace del contrato copiado al portapapeles');
  };

  // ==========================================
  // HANDLERS: CATEGORIES
  // ==========================================

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    startTransition(async () => {
      try {
        await createCategory(newCatName, newCatPolicies);
        toast.success('Categoría creada exitosamente');
        setNewCatName('');
        setNewCatPolicies('');
        setCreateCategoryOpen(false);
        router.refresh();
      } catch {
        toast.error('Error al crear categoría');
      }
    });
  };

  const handleEditCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCatId || !editCatName.trim()) return;

    startTransition(async () => {
      try {
        await updateCategory(editCatId, editCatName, editCatPolicies);
        toast.success('Categoría actualizada');
        setEditCategoryOpen(false);
        router.refresh();
      } catch {
        toast.error('Error al actualizar categoría');
      }
    });
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('¿Eliminar esta categoría? Se eliminarán todos sus servicios y planes asociados.')) {
      startTransition(async () => {
        try {
          await deleteCategory(id);
          toast.success('Categoría eliminada');
          router.refresh();
        } catch {
          toast.error('Error al eliminar categoría');
        }
      });
    }
  };

  // ==========================================
  // HANDLERS: SERVICES
  // ==========================================

  const handleCreateServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSerCatId || !newSerName.trim()) return;

    startTransition(async () => {
      try {
        await createService(newSerCatId, newSerName);
        toast.success('Servicio creado');
        setNewSerName('');
        setCreateServiceOpen(false);
        router.refresh();
      } catch {
        toast.error('Error al crear servicio');
      }
    });
  };

  const handleEditServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSerId || !editSerCatId || !editSerName.trim()) return;

    startTransition(async () => {
      try {
        await updateService(editSerId, editSerCatId, editSerName);
        toast.success('Servicio actualizado');
        setEditServiceOpen(false);
        router.refresh();
      } catch {
        toast.error('Error al actualizar servicio');
      }
    });
  };

  const handleDeleteService = (id: string) => {
    if (confirm('¿Eliminar servicio? Se borrarán sus planes asociados.')) {
      startTransition(async () => {
        try {
          await deleteService(id);
          toast.success('Servicio eliminado');
          router.refresh();
        } catch {
          toast.error('Error al eliminar servicio');
        }
      });
    }
  };

  // ==========================================
  // HANDLERS: PLANS
  // ==========================================

  const handleCreatePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanSerId || !newPlanName.trim() || !newPlanPrice) return;

    startTransition(async () => {
      try {
        await createServicePlan(
          newPlanSerId,
          newPlanName,
          parseFloat(newPlanPrice) || 0,
          newPlanDuration,
          newPlanFeatures,
          newPlanPolicies
        );
        toast.success('Plan creado con éxito');
        setNewPlanName('');
        setNewPlanPrice('');
        setNewPlanFeatures('');
        setNewPlanPolicies('');
        setCreatePlanOpen(false);
        router.refresh();
      } catch {
        toast.error('Error al crear plan');
      }
    });
  };

  const handleEditPlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlanId || !editPlanName.trim() || !editPlanPrice) return;

    startTransition(async () => {
      try {
        await updateServicePlan(
          editPlanId,
          editPlanName,
          parseFloat(editPlanPrice) || 0,
          editPlanDuration,
          editPlanFeatures,
          editPlanPolicies
        );
        toast.success('Plan actualizado');
        setEditPlanOpen(false);
        router.refresh();
      } catch {
        toast.error('Error al actualizar plan');
      }
    });
  };

  const handleDeletePlan = (id: string) => {
    if (confirm('¿Eliminar este plan de precios?')) {
      startTransition(async () => {
        try {
          await deleteServicePlan(id);
          toast.success('Plan eliminado');
          router.refresh();
        } catch {
          toast.error('Error al eliminar plan');
        }
      });
    }
  };

  // ==========================================
  // HANDLERS: SETTINGS & SMTP
  // ==========================================

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await updateSettings({
          brand_name: brandName,
          brand_logo: brandLogo,
          color_primary: colorPrim,
          color_secondary: colorSec,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_pass: smtpPass
        });
        toast.success('Ajustes de marca y correo guardados');
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || 'Error al guardar ajustes');
      }
    });
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient) {
      toast.error('Ingresa un correo destino para la prueba');
      return;
    }
    setIsSendingTest(true);
    try {
      const res = await sendTestEmail(testEmailRecipient);
      if (!res.success) {
        toast.error(res.error || 'Error al enviar correo de prueba');
      } else {
        toast.success('Correo de prueba enviado con éxito');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar correo de prueba');
    } finally {
      setIsSendingTest(false);
    }
  };

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

      setBrandLogo(finalUrl);
      toast.success('Logo subido a Supabase Storage con éxito');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir archivo a Supabase Storage');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // ==========================================
  // HANDLERS: PAYMENT METHODS
  // ==========================================

  const handleTogglePaymentMethod = async (id: string) => {
    const updated = paymentMethods.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    setPaymentMethods(updated);
    try {
      await savePaymentMethods(updated);
      toast.success('Estado del método de pago actualizado');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar');
    }
  };

  const handleSaveEditedPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethodForEdit) return;
    try {
      const updated = paymentMethods.map((m) =>
        m.id === selectedMethodForEdit.id ? selectedMethodForEdit : m
      );
      setPaymentMethods(updated);
      await savePaymentMethods(updated);
      toast.success('Método de pago guardado con éxito');
      setEditMethodModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    }
  };

  const handleCreateMethodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName.trim()) {
      toast.error('Ingresa un nombre para el método de pago');
      return;
    }

    const newMethod: PaymentMethodConfig = {
      id: `pm-${Date.now()}`,
      name: newMethodName.trim(),
      type: newMethodType,
      logo_url: newMethodLogo || '/logos/bank.svg',
      enabled: true,
      account_holder: newMethodHolder.trim() || undefined,
      account_email: newMethodEmail.trim() || undefined,
      binance_id: newMethodBinanceId.trim() || undefined,
      wallet_address: newMethodWallet.trim() || undefined,
      network: newMethodNetwork.trim() || undefined,
      bank_name: newMethodBank.trim() || undefined,
      account_number: newMethodAccount.trim() || undefined,
      routing_number: newMethodRouting.trim() || undefined,
      instructions: newMethodInstructions.trim() || undefined
    };

    try {
      const updated = [...paymentMethods, newMethod];
      setPaymentMethods(updated);
      await savePaymentMethods(updated);
      toast.success('Nuevo método de pago agregado con éxito');
      setCreateMethodModalOpen(false);
      setNewMethodName('');
      setNewMethodType('custom');
      setNewMethodLogo('/logos/bank.svg');
      setNewMethodHolder('');
      setNewMethodEmail('');
      setNewMethodBinanceId('');
      setNewMethodWallet('');
      setNewMethodBank('');
      setNewMethodAccount('');
      setNewMethodRouting('');
      setNewMethodInstructions('');
    } catch (err: any) {
      toast.error(err.message || 'Error al crear método');
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este método de pago?')) return;
    try {
      const updated = paymentMethods.filter((m) => m.id !== id);
      setPaymentMethods(updated);
      await savePaymentMethods(updated);
      toast.success('Método de pago eliminado');
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    }
  };

  const handleMethodLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMethodLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir imagen');
      if (isNew) {
        setNewMethodLogo(data.url);
      } else if (selectedMethodForEdit) {
        setSelectedMethodForEdit({ ...selectedMethodForEdit, logo_url: data.url });
      }
      toast.success('Logo subido correctamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al subir archivo');
    } finally {
      setIsUploadingMethodLogo(false);
    }
  };

  // Calculations for KPI Cards
  const totalInvoiced = proposals.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  const totalPaid = proposals.filter((p) => p.payment_status === 'PAGADO').length;
  const totalPending = proposals.filter((p) => p.payment_status !== 'PAGADO').length;

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8'>
      {/* Top Banner & Quick Action */}
      <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2'>
            <span>Panel de Gestión</span>
            <span className='text-primary'>•</span>
            <span className='font-normal text-muted-foreground text-lg sm:text-xl'>
              {brandName}
            </span>
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Control centralizado de propuestas comerciales, catálogo de servicios y ajustes corporativos
          </p>
        </div>

        <Link href='/dashboard/propuestas/crear'>
          <Button className='bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-md cursor-pointer flex items-center gap-2'>
            <Icons.add className='h-4 w-4' />
            <span>Nueva Propuesta</span>
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <Card className='p-4 border-border/60 bg-card/60 backdrop-blur-sm'>
          <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
            Total Propuestas
          </p>
          <div className='flex items-baseline justify-between mt-2'>
            <span className='text-2xl font-bold'>{proposals.length}</span>
            <Badge variant='secondary' className='text-xs'>Activas</Badge>
          </div>
        </Card>

        <Card className='p-4 border-border/60 bg-card/60 backdrop-blur-sm'>
          <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
            Facturación Total
          </p>
          <div className='flex items-baseline justify-between mt-2'>
            <span className='text-2xl font-bold'>${totalInvoiced.toLocaleString()}</span>
            <span className='text-xs text-muted-foreground'>USD</span>
          </div>
        </Card>

        <Card className='p-4 border-border/60 bg-card/60 backdrop-blur-sm'>
          <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
            Contratos Pagados
          </p>
          <div className='flex items-baseline justify-between mt-2'>
            <span className='text-2xl font-bold text-emerald-500'>{totalPaid}</span>
            <span className='text-xs text-emerald-500/80 font-medium'>100% Cobrado</span>
          </div>
        </Card>

        <Card className='p-4 border-border/60 bg-card/60 backdrop-blur-sm'>
          <p className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
            Por Cobrar / Pendientes
          </p>
          <div className='flex items-baseline justify-between mt-2'>
            <span className='text-2xl font-bold text-amber-500'>{totalPending}</span>
            <span className='text-xs text-amber-500/80 font-medium'>En seguimiento</span>
          </div>
        </Card>
      </div>

      {/* CENTERED NAVIGATION TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full space-y-6'>
        <div className='flex justify-center border-b border-border/40 pb-2'>
          <TabsList className='bg-muted/60 p-1 rounded-xl h-auto flex flex-wrap gap-1'>
            <TabsTrigger
              value='propuestas'
              className='px-4 py-2 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer'
            >
              Propuestas ({proposals.length})
            </TabsTrigger>
            <TabsTrigger
              value='categorias'
              className='px-4 py-2 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer'
            >
              Categorías ({catalog.length})
            </TabsTrigger>
            <TabsTrigger
              value='servicios'
              className='px-4 py-2 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer'
            >
              Servicios y Planes
            </TabsTrigger>
            <TabsTrigger
              value='branding'
              className='px-4 py-2 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer flex items-center gap-1.5'
            >
              <Icons.settings className='h-3.5 w-3.5' />
              <span>Ajustes de Marca</span>
            </TabsTrigger>
            <TabsTrigger
              value='metodos_pago'
              className='px-4 py-2 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm cursor-pointer flex items-center gap-1.5'
            >
              <Icons.creditCard className='h-3.5 w-3.5' />
              <span>Métodos de Pago ({paymentMethods.filter((m) => m.enabled).length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PROPUESTAS */}
        {/* ======================================================== */}
        <TabsContent value='propuestas' className='space-y-4'>
          <Card className='border-border/60 bg-card/60 backdrop-blur-sm shadow-sm'>
            <CardHeader className='flex flex-row items-center justify-between pb-4'>
              <div>
                <CardTitle className='text-lg font-bold'>Historial de Propuestas & Contratos</CardTitle>
                <CardDescription>
                  Listado de contratos generados con estado de facturación, firma y accesos
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {proposals.length === 0 ? (
                <div className='text-center py-12 text-muted-foreground'>
                  <Icons.fileText className='mx-auto h-12 w-12 text-muted-foreground/40 mb-3' />
                  <p className='font-semibold text-foreground text-base'>No hay propuestas registradas</p>
                  <p className='text-sm mt-1'>Crea tu primera propuesta haciendo clic en "Nueva Propuesta"</p>
                </div>
              ) : (
                <div className='overflow-x-auto rounded-lg border border-border/40'>
                  <Table>
                    <TableHeader className='bg-muted/40'>
                      <TableRow>
                        <TableHead className='font-semibold'>Cliente / Empresa</TableHead>
                        <TableHead className='font-semibold'>Servicios Contratados</TableHead>
                        <TableHead className='font-semibold'>Inversión</TableHead>
                        <TableHead className='font-semibold'>Estado Pago</TableHead>
                        <TableHead className='font-semibold'>Firma Digital</TableHead>
                        <TableHead className='font-semibold'>Fecha</TableHead>
                        <TableHead className='text-right font-semibold'>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposals.map((prop) => {
                        const totalAmount =
                          prop.services?.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0) ||
                          prop.price ||
                          0;
                        const servicesList =
                          prop.services?.map((s) => s.service_name).join(', ') ||
                          prop.service_name ||
                          'Servicio general';

                        const isSigned = !!prop.signature_image;
                        const isPaid = prop.payment_status === 'PAGADO';
                        const isPartial = prop.payment_status === 'PARCIAL';

                        const hasRecurrent =
                          prop.services?.some((s) => s.billing_type === 'RECURRENT') ||
                          (prop.duration && prop.duration !== 'Pago Único' && prop.duration !== 'Un único pago');
                        const hasOneTime =
                          prop.services?.some((s) => s.billing_type === 'ONE_TIME') ||
                          prop.duration === 'Pago Único' ||
                          prop.duration === 'Un único pago';
                        const isMixed = hasRecurrent && hasOneTime;
                        const isPureOneTime = hasOneTime && !hasRecurrent;

                        return (
                          <TableRow key={prop.id} className='hover:bg-muted/30 transition-colors'>
                            <TableCell>
                              <div className='font-semibold text-foreground'>
                                {prop.client_company}
                              </div>
                              <div className='text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5'>
                                <span>{prop.client_name}</span>
                                {prop.client_domain ? (
                                  <>
                                    <span>•</span>
                                    <span className='text-primary font-mono'>{prop.client_domain}</span>
                                  </>
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell className='max-w-[260px]'>
                              <div className='flex items-center gap-1.5 flex-wrap mb-1'>
                                {isPureOneTime ? (
                                  <Badge className='bg-blue-500/10 text-blue-500 border border-blue-500/30 text-[10px] font-bold py-0'>
                                    PAGO ÚNICO
                                  </Badge>
                                ) : isMixed ? (
                                  <Badge className='bg-indigo-500/10 text-indigo-500 border border-indigo-500/30 text-[10px] font-bold py-0'>
                                    MIXTO
                                  </Badge>
                                ) : (
                                  <Badge className='bg-purple-500/10 text-purple-500 border border-purple-500/30 text-[10px] font-bold py-0'>
                                    RECURRENTE ({prop.duration || 'ANUAL'})
                                  </Badge>
                                )}
                                <span className='text-xs text-muted-foreground font-mono'>
                                  #{prop.invoice_number}
                                </span>
                              </div>
                              <div className='text-sm font-medium truncate' title={servicesList}>
                                {servicesList}
                              </div>
                              {hasRecurrent && prop.service_expiration ? (
                                <div className='text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5'>
                                  <Icons.calendar className='h-3 w-3 text-purple-400 shrink-0' />
                                  <span>
                                    Próx. Renovación: <strong>{prop.service_expiration.split('T')[0]}</strong>
                                  </span>
                                </div>
                              ) : null}
                            </TableCell>

                            <TableCell>
                              <div className='font-bold text-sm'>
                                ${totalAmount.toLocaleString()} USD
                              </div>
                              {prop.payment_amount && prop.payment_amount > 0 ? (
                                <div className='text-[11px] text-muted-foreground'>
                                  Abonado: ${prop.payment_amount.toLocaleString()}
                                </div>
                              ) : null}
                            </TableCell>

                            <TableCell>
                              {prop.payments?.some((p) => p.status === 'PENDIENTE') ? (
                                <Badge className='bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs font-semibold'>
                                  RENOVACIÓN PENDIENTE
                                </Badge>
                              ) : isPaid ? (
                                <Badge className='bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-xs font-semibold'>
                                  VIGENTE
                                </Badge>
                              ) : isPartial ? (
                                <Badge className='bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs font-semibold'>
                                  PARCIAL
                                </Badge>
                              ) : (
                                <Badge variant='outline' className='text-muted-foreground text-xs'>
                                  PENDIENTE
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell>
                              {isSigned ? (
                                <div className='flex items-center gap-1.5 text-xs text-emerald-500 font-medium'>
                                  <Icons.circleCheck className='h-4 w-4 shrink-0' />
                                  <span>Firmado</span>
                                </div>
                              ) : (
                                <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                  <Icons.clock className='h-4 w-4 shrink-0' />
                                  <span>Pendiente</span>
                                </div>
                              )}
                            </TableCell>

                            <TableCell className='text-xs text-muted-foreground font-mono'>
                              {prop.created_at ? prop.created_at.split('T')[0] : '-'}
                            </TableCell>

                            <TableCell className='text-right'>
                              <div className='flex items-center justify-end gap-1'>
                                {/* Enlace público */}
                                <a
                                  href={`/p/${prop.id}`}
                                  target='_blank'
                                  rel='noreferrer'
                                  title='Abrir portal interactivo del cliente'
                                >
                                  <Button variant='ghost' size='sm' className='h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground'>
                                    <Icons.externalLink className='h-4 w-4' />
                                  </Button>
                                </a>

                                {/* Renovar Periodo / Cuota Recurrente (Solo para contratos con recurrentes) */}
                                {!isPureOneTime && (
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => handleOpenRenewalModal(prop)}
                                    className='h-8 w-8 p-0 cursor-pointer text-amber-500 hover:text-amber-400'
                                    title='Renovar Periodo / Generar Cuota de Cobro'
                                  >
                                    <Icons.calendarPlus className='h-4 w-4' />
                                  </Button>
                                )}

                                {/* Registrar Pago */}
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleOpenPaymentModal(prop)}
                                  className='h-8 w-8 p-0 cursor-pointer text-emerald-500 hover:text-emerald-400'
                                  title='Registrar Pago o Abono'
                                >
                                  <Icons.creditCard className='h-4 w-4' />
                                </Button>

                                {/* Ver Detalles */}
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleOpenDetails(prop.id)}
                                  className='h-8 w-8 p-0 cursor-pointer text-blue-500 hover:text-blue-400'
                                  title='Ver Detalles y Credenciales'
                                >
                                  <Icons.eye className='h-4 w-4' />
                                </Button>

                                {/* Enviar por Correo */}
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleOpenEmailModal(prop)}
                                  className='h-8 w-8 p-0 cursor-pointer text-purple-500 hover:text-purple-400'
                                  title='Enviar por correo electrónico'
                                >
                                  <Icons.send className='h-4 w-4' />
                                </Button>

                                {/* Copiar Link */}
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => copyPublicLink(prop.id)}
                                  className='h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground'
                                  title='Copiar Link de la Propuesta'
                                >
                                  <Icons.copy className='h-4 w-4' />
                                </Button>

                                {/* Eliminar */}
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleDeleteProposal(prop.id)}
                                  className='h-8 w-8 p-0 cursor-pointer text-destructive/70 hover:text-destructive'
                                  title='Eliminar Propuesta'
                                >
                                  <Icons.trash className='h-4 w-4' />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: CATEGORÍAS */}
        {/* ======================================================== */}
        <TabsContent value='categorias' className='space-y-4'>
          <Card className='border-border/60 bg-card/60 backdrop-blur-sm'>
            <CardHeader className='flex flex-row items-center justify-between pb-4'>
              <div>
                <CardTitle className='text-lg font-bold'>Categorías del Catálogo</CardTitle>
                <CardDescription>
                  Organiza tus líneas de negocio y define las políticas legales asociadas a cada categoría
                </CardDescription>
              </div>
              <Button
                onClick={() => setCreateCategoryOpen(true)}
                size='sm'
                className='bg-primary text-primary-foreground hover:bg-primary/90 font-medium cursor-pointer flex items-center gap-1.5'
              >
                <Icons.add className='h-4 w-4' />
                <span>Nueva Categoría</span>
              </Button>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                {catalog.map((cat) => (
                  <Card key={cat.id} className='border-border/60 bg-background/50 flex flex-col justify-between'>
                    <CardHeader className='pb-3'>
                      <div className='flex items-start justify-between'>
                        <CardTitle className='text-base font-bold text-foreground'>
                          {cat.name}
                        </CardTitle>
                        <Badge variant='outline' className='text-xs font-mono'>
                          {cat.services?.length || 0} servicios
                        </Badge>
                      </div>
                      <CardDescription className='text-xs line-clamp-2 mt-1'>
                        {cat.policies || 'Sin políticas específicas configuradas.'}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className='flex justify-end gap-2 pt-2 border-t border-border/30'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          setEditCatId(cat.id);
                          setEditCatName(cat.name);
                          setEditCatPolicies(cat.policies || '');
                          setEditCategoryOpen(true);
                        }}
                        className='h-8 text-xs cursor-pointer'
                      >
                        <Icons.edit className='h-3.5 w-3.5 mr-1' />
                        Editar
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleDeleteCategory(cat.id)}
                        className='h-8 text-xs text-destructive hover:text-destructive cursor-pointer'
                      >
                        <Icons.trash className='h-3.5 w-3.5 mr-1' />
                        Eliminar
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 3: SERVICIOS Y PLANES */}
        {/* ======================================================== */}
        <TabsContent value='servicios' className='space-y-6'>
          <div className='flex justify-between items-center'>
            <div>
              <h3 className='text-lg font-bold'>Catálogo de Servicios & Planes de Precios</h3>
              <p className='text-xs text-muted-foreground'>
                Administra los precios, características y vigencias de cada servicio para propuestas dinámicas
              </p>
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setCreateServiceOpen(true)}
                className='cursor-pointer text-xs'
              >
                <Icons.add className='h-3.5 w-3.5 mr-1' />
                Nuevo Servicio
              </Button>
              <Button
                size='sm'
                onClick={() => setCreatePlanOpen(true)}
                className='bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer text-xs'
              >
                <Icons.add className='h-3.5 w-3.5 mr-1' />
                Nuevo Plan
              </Button>
            </div>
          </div>

          <div className='space-y-6'>
            {catalog.map((cat) => (
              <div key={cat.id} className='space-y-3'>
                <div className='flex items-center gap-2 border-b border-border/40 pb-2'>
                  <Icons.folder className='h-4 w-4 text-primary' />
                  <h4 className='font-bold text-sm tracking-wide uppercase text-foreground'>
                    {cat.name}
                  </h4>
                  <span className='text-xs text-muted-foreground'>({cat.services?.length || 0})</span>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {cat.services?.map((srv) => (
                    <Card key={srv.id} className='border-border/60 bg-card/60 flex flex-col justify-between'>
                      <CardHeader className='pb-3'>
                        <div className='flex items-start justify-between'>
                          <div>
                            <CardTitle className='text-sm font-bold'>{srv.name}</CardTitle>
                            <span className='text-[11px] text-muted-foreground font-mono'>
                              ID: {srv.id}
                            </span>
                          </div>
                          <div className='flex gap-1'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => {
                                setEditSerId(srv.id);
                                setEditSerCatId(cat.id);
                                setEditSerName(srv.name);
                                setEditServiceOpen(true);
                              }}
                              className='h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground'
                            >
                              <Icons.edit className='h-3.5 w-3.5' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleDeleteService(srv.id)}
                              className='h-7 w-7 p-0 cursor-pointer text-destructive/70 hover:text-destructive'
                            >
                              <Icons.trash className='h-3.5 w-3.5' />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className='space-y-2 pt-0'>
                        <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                          Planes ({srv.plans?.length || 0})
                        </p>
                        <div className='space-y-1.5'>
                          {srv.plans?.map((plan) => (
                            <div
                              key={plan.id}
                              className='p-2 rounded-md bg-muted/40 border border-border/40 flex items-center justify-between text-xs'
                            >
                              <div>
                                <span className='font-bold text-foreground'>{plan.name}</span>
                                <span className='text-muted-foreground ml-1.5'>
                                  ${plan.price} / {plan.duration}
                                </span>
                              </div>
                              <div className='flex items-center gap-1'>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => {
                                    setEditPlanId(plan.id);
                                    setEditPlanName(plan.name);
                                    setEditPlanPrice(plan.price.toString());
                                    setEditPlanDuration(plan.duration || '1 año');
                                    setEditPlanFeatures(plan.features || '');
                                    setEditPlanPolicies(plan.policies || '');
                                    setEditPlanOpen(true);
                                  }}
                                  className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground cursor-pointer'
                                >
                                  <Icons.edit className='h-3 w-3' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleDeletePlan(plan.id)}
                                  className='h-6 w-6 p-0 text-destructive/70 hover:text-destructive cursor-pointer'
                                >
                                  <Icons.trash className='h-3 w-3' />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 4: AJUSTES DE MARCA */}
        {/* ======================================================== */}
        <TabsContent value='branding' className='space-y-6'>
          <form onSubmit={handleSaveSettings} className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {/* Branding Visual */}
              <Card className='border-border/60 bg-card/60 backdrop-blur-sm'>
                <CardHeader>
                  <CardTitle className='text-base font-bold flex items-center gap-2'>
                    <Icons.palette className='h-4 w-4 text-primary' />
                    Identidad Visual & Marca Blanca
                  </CardTitle>
                  <CardDescription>
                    Personaliza el nombre, logo y colores que verán tus clientes en los contratos digitales
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='brandName'>Nombre Comercial de la Agencia</Label>
                    <Input
                      id='brandName'
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder='Ej: Sin Límites / Alquimia'
                    />
                  </div>

                  <div className='space-y-3 p-4 rounded-xl border border-border/60 bg-muted/20'>
                    <div className='flex items-center justify-between'>
                      <Label htmlFor='brandLogo' className='font-semibold text-sm'>
                        Logo Corporativo (Supabase Storage)
                      </Label>
                      <Button
                        type='button'
                        variant='ghost'
                        size='xs'
                        onClick={() => setBrandLogo('https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg')}
                        className='text-[11px] text-blue-500 hover:text-blue-600 cursor-pointer'
                      >
                        Restablecer al Oficial SVG
                      </Button>
                    </div>

                    <div className='flex flex-col sm:flex-row items-center gap-4'>
                      {brandLogo ? (
                        <div className='h-16 w-36 rounded-lg border border-border/60 bg-slate-950/80 p-2 flex items-center justify-center shrink-0 shadow-inner'>
                          <img
                            src={brandLogo}
                            alt='Logo'
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
                            id='logoUpload'
                            type='file'
                            accept='image/svg+xml,image/png,image/jpeg,image/webp'
                            onChange={handleLogoUpload}
                            disabled={isUploadingLogo}
                            className='text-xs file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer'
                          />
                          {isUploadingLogo && (
                            <Icons.spinner className='h-4 w-4 animate-spin text-primary shrink-0' />
                          )}
                        </div>
                        <Input
                          id='brandLogo'
                          value={brandLogo}
                          onChange={(e) => setBrandLogo(e.target.value)}
                          placeholder='URL en Supabase Storage o https://...'
                          className='text-xs font-mono text-muted-foreground'
                        />
                      </div>
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='colorPrim'>Color Primario</Label>
                      <div className='flex items-center gap-2'>
                        <input
                          type='color'
                          id='colorPrim'
                          value={colorPrim}
                          onChange={(e) => setColorPrim(e.target.value)}
                          className='h-9 w-9 rounded border border-border cursor-pointer p-0 bg-transparent'
                        />
                        <Input
                          value={colorPrim}
                          onChange={(e) => setColorPrim(e.target.value)}
                          className='font-mono text-xs'
                        />
                      </div>
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='colorSec'>Color Secundario</Label>
                      <div className='flex items-center gap-2'>
                        <input
                          type='color'
                          id='colorSec'
                          value={colorSec}
                          onChange={(e) => setColorSec(e.target.value)}
                          className='h-9 w-9 rounded border border-border cursor-pointer p-0 bg-transparent'
                        />
                        <Input
                          value={colorSec}
                          onChange={(e) => setColorSec(e.target.value)}
                          className='font-mono text-xs'
                        />
                      </div>
                    </div>
                  </div>

                  {/* Vista Previa */}
                  <div
                    className='p-4 rounded-xl border border-border/50 text-white flex items-center justify-between mt-4'
                    style={{ backgroundColor: colorSec }}
                  >
                    <div className='flex items-center gap-3'>
                      {brandLogo ? (
                        <img src={brandLogo} alt='Logo Preview' className='h-8 w-8 object-contain' />
                      ) : null}
                      <span className='font-bold text-sm'>{brandName}</span>
                    </div>
                    <button
                      type='button'
                      className='px-3 py-1.5 rounded-md text-xs font-bold'
                      style={{ backgroundColor: colorPrim, color: '#ffffff' }}
                    >
                      Boton de Ejemplo
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Servidor de Correo SMTP */}
              <Card className='border-border/60 bg-card/60 backdrop-blur-sm'>
                <CardHeader>
                  <CardTitle className='text-base font-bold flex items-center gap-2'>
                    <Icons.send className='h-4 w-4 text-primary' />
                    Servidor de Correo (SMTP)
                  </CardTitle>
                  <CardDescription>
                    Configura tus credenciales SMTP para enviar las propuestas directamente al cliente
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-3 gap-2'>
                    <div className='col-span-2 space-y-2'>
                      <Label htmlFor='smtpHost'>Host SMTP</Label>
                      <Input
                        id='smtpHost'
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder='smtp.mailgun.org'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='smtpPort'>Puerto</Label>
                      <Input
                        id='smtpPort'
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                        placeholder='587'
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='smtpUser'>Usuario / Correo</Label>
                    <Input
                      id='smtpUser'
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder='propuestas@miagencia.com'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='smtpPass'>Contraseña</Label>
                    <Input
                      id='smtpPass'
                      type='password'
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder='••••••••••••'
                    />
                  </div>

                  {/* Prueba de Correo */}
                  <div className='pt-2 border-t border-border/40 flex items-center gap-2'>
                    <Input
                      placeholder='correo-prueba@ejemplo.com'
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      className='text-xs h-9'
                    />
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      disabled={isSendingTest}
                      onClick={handleSendTestEmail}
                      className='text-xs shrink-0 cursor-pointer'
                    >
                      {isSendingTest ? 'Enviando...' : 'Probar Envío'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className='flex justify-end'>
              <Button
                type='submit'
                disabled={isPending}
                className='bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 cursor-pointer'
              >
                {isPending ? 'Guardando...' : 'Guardar Todos los Ajustes'}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 5: MÉTODOS DE PAGO (ZELLE, BINANCE, BANCO, CUSTOM) */}
        {/* ======================================================== */}
        <TabsContent value='metodos_pago' className='space-y-6'>
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
            <div>
              <h2 className='text-xl font-bold tracking-tight text-foreground flex items-center gap-2'>
                <Icons.creditCard className='h-5 w-5 text-primary' />
                <span>Canales y Cuentas de Cobro</span>
              </h2>
              <p className='text-xs text-muted-foreground mt-1'>
                Configura los métodos de pago (Zelle, Binance Pay, cuentas bancarias o personalizados) que tus clientes verán para pagar sus contratos.
              </p>
            </div>
            <Button
              type='button'
              onClick={() => setCreateMethodModalOpen(true)}
              className='bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-sm'
            >
              <Icons.add className='h-4 w-4' />
              <span>Nuevo Método Personalizado</span>
            </Button>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
            {paymentMethods.map((pm) => (
              <Card
                key={pm.id}
                className={`border transition-all duration-200 flex flex-col justify-between ${
                  pm.enabled
                    ? 'border-border/80 bg-card/80 shadow-sm'
                    : 'border-border/40 bg-muted/20 opacity-70'
                }`}
              >
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <div className='w-11 h-11 rounded-xl bg-slate-950 p-2 flex items-center justify-center shrink-0 border border-slate-800 shadow-inner'>
                        <img
                          src={pm.logo_url}
                          alt={pm.name}
                          className='max-h-full max-w-full object-contain'
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logos/bank.svg';
                          }}
                        />
                      </div>
                      <div>
                        <CardTitle className='text-base font-bold text-foreground'>{pm.name}</CardTitle>
                        <span className='text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-1 inline-block'>
                          {pm.type === 'zelle' ? 'Zelle USA' : pm.type === 'binance' ? 'Binance Pay / Cripto' : pm.type === 'bank_transfer' ? 'Banca Tradicional' : 'Personalizado'}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Switch
                        checked={pm.enabled}
                        onCheckedChange={() => handleTogglePaymentMethod(pm.id)}
                        title={pm.enabled ? 'Método activo' : 'Método desactivado'}
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className='space-y-2.5 text-xs text-muted-foreground flex-1'>
                  <div className='p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1.5'>
                    {pm.account_email && (
                      <div className='flex justify-between gap-2'>
                        <span className='text-foreground/70'>Correo:</span>
                        <span className='font-mono font-medium text-foreground truncate max-w-[170px]'>{pm.account_email}</span>
                      </div>
                    )}
                    {pm.account_holder && (
                      <div className='flex justify-between gap-2'>
                        <span className='text-foreground/70'>Titular:</span>
                        <span className='font-medium text-foreground truncate max-w-[170px]'>{pm.account_holder}</span>
                      </div>
                    )}
                    {pm.binance_id && (
                      <div className='flex justify-between gap-2'>
                        <span className='text-foreground/70'>Pay ID:</span>
                        <span className='font-mono font-bold text-amber-500'>{pm.binance_id}</span>
                      </div>
                    )}
                    {pm.network && (
                      <div className='flex justify-between gap-2'>
                        <span className='text-foreground/70'>Red:</span>
                        <span className='font-semibold text-foreground'>{pm.network}</span>
                      </div>
                    )}
                    {pm.wallet_address && (
                      <div className='space-y-0.5 pt-1 border-t border-border/40'>
                        <span className='text-foreground/70 text-[10px] block'>Billetera:</span>
                        <span className='font-mono text-[10px] text-foreground break-all block bg-background/60 p-1 rounded'>
                          {pm.wallet_address}
                        </span>
                      </div>
                    )}
                    {pm.bank_name && (
                      <div className='flex justify-between gap-2'>
                        <span className='text-foreground/70'>Banco:</span>
                        <span className='font-medium text-foreground'>{pm.bank_name}</span>
                      </div>
                    )}
                    {pm.account_number && (
                      <div className='flex justify-between gap-2'>
                        <span className='text-foreground/70'>Cuenta:</span>
                        <span className='font-mono font-medium text-foreground truncate max-w-[160px]'>{pm.account_number}</span>
                      </div>
                    )}
                    {pm.routing_number && (
                      <div className='flex justify-between gap-2'>
                        <span className='text-foreground/70'>Doc / RIF:</span>
                        <span className='font-mono text-foreground'>{pm.routing_number}</span>
                      </div>
                    )}
                  </div>

                  {pm.instructions && (
                    <p className='text-[11px] italic line-clamp-2 text-muted-foreground/80'>
                      "{pm.instructions}"
                    </p>
                  )}
                </CardContent>

                <CardFooter className='pt-2 pb-4 flex items-center justify-between border-t border-border/40 mt-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setSelectedMethodForEdit({ ...pm });
                      setEditMethodModalOpen(true);
                    }}
                    className='text-xs font-semibold cursor-pointer'
                  >
                    <Icons.edit className='h-3.5 w-3.5 mr-1 text-primary' />
                    Editar Datos
                  </Button>

                  {pm.type === 'custom' && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => handleDeletePaymentMethod(pm.id)}
                      className='text-xs text-destructive hover:text-destructive/80 cursor-pointer'
                    >
                      <Icons.trash className='h-3.5 w-3.5' />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR PAGO */}
      {/* ======================================================== */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Registrar Pago / Abono</DialogTitle>
            <DialogDescription>
              {selectedProposalForPayment?.client_company} — #{selectedProposalForPayment?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterPaymentSubmit} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Monto a Registrar (USD)</Label>
              <Input
                type='number'
                step='0.01'
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder='0.00'
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val || 'Transferencia')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Transferencia'>Transferencia</SelectItem>
                    <SelectItem value='Binance'>Binance Pay</SelectItem>
                    <SelectItem value='Zelle'>Zelle</SelectItem>
                    <SelectItem value='Efectivo'>Efectivo</SelectItem>
                    <SelectItem value='Tarjeta'>Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label>Fecha del Pago</Label>
                <Input
                  type='date'
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Concepto / Referencia</Label>
              <Input
                value={paymentDesc}
                onChange={(e) => setPaymentDesc(e.target.value)}
                placeholder='Abono inicial / Referencia bancaria'
              />
            </div>

            {paymentNewExpirationDate ? (
              <div className='space-y-1.5 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5'>
                <Label className='text-xs text-emerald-600 dark:text-emerald-400 font-bold'>
                  Nueva Fecha de Vigencia del Servicio
                </Label>
                <Input
                  type='date'
                  value={paymentNewExpirationDate}
                  onChange={(e) => setPaymentNewExpirationDate(e.target.value)}
                />
                <p className='text-[10px] text-muted-foreground'>
                  Al confirmar el pago, la vigencia del contrato se actualizará automáticamente a esta fecha.
                </p>
              </div>
            ) : null}

            <DialogFooter className='pt-2'>
              <Button type='button' variant='outline' onClick={() => setPaymentModalOpen(false)}>
                Cancelar
              </Button>
              <Button type='submit' className='bg-emerald-600 hover:bg-emerald-500 text-white font-medium'>
                Confirmar Pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: VER DETALLES */}
      {/* ======================================================== */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className='max-w-2xl max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center justify-between pr-6'>
              <span>Detalles del Contrato</span>
              {detailedProposal?.proposal?.invoice_number ? (
                <Badge variant='outline' className='font-mono'>
                  #{detailedProposal.proposal.invoice_number}
                </Badge>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {detailedProposal?.proposal?.client_company} — {detailedProposal?.proposal?.client_name}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className='py-12 flex justify-center'>
              <Icons.spinner className='h-8 w-8 animate-spin text-primary' />
            </div>
          ) : detailedProposal?.proposal ? (
            <div className='space-y-6 py-2 text-sm'>
              {/* Servicios Contratados */}
              <div className='space-y-2'>
                <h4 className='font-bold text-xs uppercase tracking-wider text-muted-foreground'>
                  Servicios y Planes Incluidos
                </h4>
                <div className='rounded-lg border border-border/40 divide-y divide-border/30'>
                  {detailedProposal.services.map((srv, idx) => (
                    <div key={idx} className='p-3 flex justify-between items-center'>
                      <div>
                        <div className='font-semibold'>{srv.service_name}</div>
                        <div className='text-xs text-muted-foreground'>
                          {srv.category_name} • Plan: {srv.plan_name} • Ciclo: {srv.billing_cycle || 'Anual'}
                        </div>
                      </div>
                      <div className='font-bold text-sm'>${srv.price} USD</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historial de Pagos */}
              <div className='space-y-2'>
                <h4 className='font-bold text-xs uppercase tracking-wider text-muted-foreground'>
                  Historial de Pagos & Cuotas ({detailedProposal.payments.length})
                </h4>
                {detailedProposal.payments.length === 0 ? (
                  <p className='text-xs text-muted-foreground'>Sin pagos registrados</p>
                ) : (
                  <div className='rounded-lg border border-border/40 divide-y divide-border/30'>
                    {detailedProposal.payments.map((pm, idx) => {
                      const isPending = pm.status === 'PENDIENTE';
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 flex justify-between items-center text-xs ${
                            isPending ? 'bg-amber-500/10 border-l-2 border-amber-500' : ''
                          }`}
                        >
                          <div>
                            <span className='font-semibold'>{pm.description || 'Cuota'}</span>
                            <span className='text-muted-foreground ml-2'>
                              {isPending
                                ? (pm.due_date ? `Vence: ${pm.due_date}` : 'Pendiente de pago')
                                : `${pm.payment_date} (${pm.payment_method})`}
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className={`font-bold ${isPending ? 'text-amber-500' : ''}`}>
                              ${pm.amount}
                            </span>
                            <Badge
                              variant='outline'
                              className={`text-[10px] ${
                                isPending
                                  ? 'border-amber-500/40 text-amber-500 bg-amber-500/10 font-bold'
                                  : 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                              }`}
                            >
                              {pm.status}
                            </Badge>
                            {isPending && detailedProposal.proposal ? (
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => {
                                  setDetailsModalOpen(false);
                                  handleOpenPaymentModalForCuota(detailedProposal.proposal!, pm);
                                }}
                                className='h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white border-none cursor-pointer'
                              >
                                Registrar Pago
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Credenciales de Acceso */}
              <div className='space-y-2'>
                <h4 className='font-bold text-xs uppercase tracking-wider text-muted-foreground'>
                  Credenciales de Acceso (Portal de Cliente)
                </h4>
                {detailedProposal.credentials.length === 0 ? (
                  <p className='text-xs text-muted-foreground'>Sin credenciales asignadas</p>
                ) : (
                  <div className='rounded-lg border border-border/40 divide-y divide-border/30'>
                    {detailedProposal.credentials.map((cr, idx) => (
                      <div key={idx} className='p-3 text-xs space-y-1 bg-muted/20'>
                        <div className='font-bold text-foreground'>{cr.description}</div>
                        <div className='text-muted-foreground'>Usuario: <span className='font-mono text-foreground'>{cr.email}</span></div>
                        <div className='text-muted-foreground'>Clave: <span className='font-mono text-foreground'>{cr.password}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Firma Digital */}
              {detailedProposal.proposal.signature_image ? (
                <div className='space-y-2'>
                  <h4 className='font-bold text-xs uppercase tracking-wider text-muted-foreground'>
                    Firma Digital Registrada
                  </h4>
                  <div className='p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between'>
                    <div className='text-xs text-emerald-600 dark:text-emerald-400'>
                      Firmado legalmente el {detailedProposal.proposal.signature_date?.split('T')[0]}
                    </div>
                    <img
                      src={detailedProposal.proposal.signature_image}
                      alt='Firma'
                      className='h-10 bg-white rounded p-1 border border-border'
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: ENVIAR PROPUESTA / PORTAL POR CORREO */}
      {/* ======================================================== */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {selectedProposalForEmail?.signature_image
                ? 'Enviar Acceso al Portal de Cliente'
                : 'Enviar Propuesta al Cliente'}
            </DialogTitle>
            <DialogDescription>
              {selectedProposalForEmail?.signature_image
                ? 'El contrato ya se encuentra firmado. Se enviará un correo con el enlace directo al Portal de Seguimiento y Estado de Pagos.'
                : 'Se enviará un correo con el enlace directo para revisar y formalizar con firma digital.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendProposalEmailSubmit} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Correo del Destinatario</Label>
              <Input
                type='email'
                required
                value={proposalRecipientEmail}
                onChange={(e) => setProposalRecipientEmail(e.target.value)}
                placeholder='cliente@empresa.com'
              />
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setEmailModalOpen(false)}>
                Cancelar
              </Button>
              <Button type='submit' disabled={isSendingProposal} className='bg-primary font-medium'>
                {isSendingProposal
                  ? 'Enviando...'
                  : selectedProposalForEmail?.signature_image
                  ? 'Enviar Acceso al Portal'
                  : 'Enviar Propuesta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: RENOVAR PERIODO / CUOTA RECURRENTE */}
      {/* ======================================================== */}
      <Dialog open={renewalModalOpen} onOpenChange={setRenewalModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Icons.calendarPlus className='h-5 w-5 text-amber-500' />
              <span>Renovar Periodo de Servicio</span>
            </DialogTitle>
            <DialogDescription>
              Genera la cuota de cobro para el siguiente ciclo recurrente de {selectedProposalForRenewal?.client_company}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGenerateRenewalSubmit} className='space-y-4 py-2'>
            <div className='p-3 rounded-lg border border-border/50 bg-muted/20 text-xs space-y-1.5'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Cliente:</span>
                <span className='font-bold'>{selectedProposalForRenewal?.client_name}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Empresa:</span>
                <span className='font-bold'>{selectedProposalForRenewal?.client_company}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Vigencia Actual:</span>
                <span className='font-mono font-medium text-amber-500'>
                  {selectedProposalForRenewal?.service_expiration?.split('T')[0] || selectedProposalForRenewal?.start_date?.split('T')[0] || 'No definida'}
                </span>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Inicio Nuevo Periodo</Label>
                <Input
                  type='date'
                  required
                  value={renewalStartDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setRenewalStartDate(newStart);
                    if (newStart) {
                      const d = new Date(newStart);
                      d.setMonth(d.getMonth() + 1);
                      const newEnd = d.toISOString().split('T')[0];
                      setRenewalEndDate(newEnd);
                      setRenewalDesc(`Renovación Mensual: ${newStart} al ${newEnd}`);
                      setRenewalDueDate(newStart);
                    }
                  }}
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Fin Nuevo Periodo</Label>
                <Input
                  type='date'
                  required
                  value={renewalEndDate}
                  onChange={(e) => setRenewalEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>Monto Cuota (USD)</Label>
                <Input
                  type='number'
                  step='0.01'
                  required
                  value={renewalAmount}
                  onChange={(e) => setRenewalAmount(e.target.value)}
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Fecha Límite de Pago</Label>
                <Input
                  type='date'
                  required
                  value={renewalDueDate}
                  onChange={(e) => setRenewalDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs'>Concepto de la Cuota</Label>
              <Input
                required
                value={renewalDesc}
                onChange={(e) => setRenewalDesc(e.target.value)}
                placeholder='Ej: Renovación Mensual: 05/11/2026 al 05/12/2026'
              />
            </div>

            <div className='flex items-center space-x-2 pt-2 border-t border-border/40'>
              <Switch
                id='notify-client'
                checked={renewalNotifyClient}
                onCheckedChange={setRenewalNotifyClient}
              />
              <Label htmlFor='notify-client' className='text-xs font-medium cursor-pointer'>
                Enviar aviso de renovación por correo al cliente automáticamente
              </Label>
            </div>

            <DialogFooter className='pt-2'>
              <Button type='button' variant='outline' onClick={() => setRenewalModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type='submit'
                disabled={isSubmittingRenewal}
                className='bg-amber-600 hover:bg-amber-500 text-white font-medium'
              >
                {isSubmittingRenewal ? 'Generando...' : 'Generar Cuota de Renovación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: NUEVA CATEGORÍA */}
      {/* ======================================================== */}
      <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Nueva Categoría de Catálogo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategorySubmit} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Nombre de la Categoría</Label>
              <Input
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder='Ej: Diseño UI/UX, Hosting Dedicado'
              />
            </div>
            <div className='space-y-2'>
              <Label>Políticas Generales (Opcional)</Label>
              <Textarea
                rows={3}
                value={newCatPolicies}
                onChange={(e) => setNewCatPolicies(e.target.value)}
                placeholder='Políticas de servicio aplicables a esta categoría...'
              />
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setCreateCategoryOpen(false)}>
                Cancelar
              </Button>
              <Button type='submit' className='bg-primary font-medium'>
                Crear Categoría
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: EDITAR CATEGORÍA */}
      {/* ======================================================== */}
      <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditCategorySubmit} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Nombre de la Categoría</Label>
              <Input
                required
                value={editCatName}
                onChange={(e) => setEditCatName(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Políticas Generales</Label>
              <Textarea
                rows={3}
                value={editCatPolicies}
                onChange={(e) => setEditCatPolicies(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setEditCategoryOpen(false)}>
                Cancelar
              </Button>
              <Button type='submit' className='bg-primary font-medium'>
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: NUEVO SERVICIO */}
      {/* ======================================================== */}
      <Dialog open={createServiceOpen} onOpenChange={setCreateServiceOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Nuevo Servicio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateServiceSubmit} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Categoría</Label>
              <Select value={newSerCatId} onValueChange={(val) => setNewSerCatId(val || '')}>
                <SelectTrigger>
                  <SelectValue placeholder='Selecciona una categoría' />
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
            <div className='space-y-2'>
              <Label>Nombre del Servicio</Label>
              <Input
                required
                value={newSerName}
                onChange={(e) => setNewSerName(e.target.value)}
                placeholder='Ej: Mantenimiento Web WordPress'
              />
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setCreateServiceOpen(false)}>
                Cancelar
              </Button>
              <Button type='submit' className='bg-primary font-medium'>
                Crear Servicio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: EDITAR SERVICIO */}
      {/* ======================================================== */}
      <Dialog open={editServiceOpen} onOpenChange={setEditServiceOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Editar Servicio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditServiceSubmit} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Categoría</Label>
              <Select value={editSerCatId} onValueChange={(val) => setEditSerCatId(val || '')}>
                <SelectTrigger>
                  <SelectValue />
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
            <div className='space-y-2'>
              <Label>Nombre del Servicio</Label>
              <Input
                required
                value={editSerName}
                onChange={(e) => setEditSerName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setEditServiceOpen(false)}>
                Cancelar
              </Button>
              <Button type='submit' className='bg-primary font-medium'>
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: NUEVO PLAN */}
      {/* ======================================================== */}
      <Dialog open={createPlanOpen} onOpenChange={setCreatePlanOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Nuevo Plan de Servicio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePlanSubmit} className='space-y-4 py-2'>
            <div className='space-y-2'>
              <Label>Servicio Perteneciente</Label>
              <Select value={newPlanSerId} onValueChange={(val) => setNewPlanSerId(val || '')}>
                <SelectTrigger>
                  <SelectValue placeholder='Selecciona el servicio' />
                </SelectTrigger>
                <SelectContent>
                  {catalog.flatMap((c) => c.services || []).map((srv) => (
                    <SelectItem key={srv.id} value={srv.id}>
                      {srv.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Nombre del Plan</Label>
                <Input
                  required
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder='Ej: Pro / Básico'
                />
              </div>
              <div className='space-y-2'>
                <Label>Precio (USD)</Label>
                <Input
                  type='number'
                  step='0.01'
                  required
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(e.target.value)}
                  placeholder='99.00'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Duración / Ciclo</Label>
              <Input
                value={newPlanDuration}
                onChange={(e) => setNewPlanDuration(e.target.value)}
                placeholder='1 año, Mensual, etc.'
              />
            </div>

            <div className='space-y-2'>
              <Label>Características (una por línea)</Label>
              <Textarea
                rows={3}
                value={newPlanFeatures}
                onChange={(e) => setNewPlanFeatures(e.target.value)}
                placeholder='SSD 50GB&#10;SSL Gratuito&#10;Soporte 24/7'
              />
            </div>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setCreatePlanOpen(false)}>
                Cancelar
              </Button>
              <Button type='submit' className='bg-primary font-medium'>
                Crear Plan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: EDITAR PLAN */}
      {/* ======================================================== */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Editar Plan de Servicio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditPlanSubmit} className='space-y-4 py-2'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Nombre del Plan</Label>
                <Input
                  required
                  value={editPlanName}
                  onChange={(e) => setEditPlanName(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label>Precio (USD)</Label>
                <Input
                  type='number'
                  step='0.01'
                  required
                  value={editPlanPrice}
                  onChange={(e) => setEditPlanPrice(e.target.value)}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Duración</Label>
              <Input
                value={editPlanDuration}
                onChange={(e) => setEditPlanDuration(e.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label>Características</Label>
              <Textarea
                rows={3}
                value={editPlanFeatures}
                onChange={(e) => setEditPlanFeatures(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setEditPlanOpen(false)}>
                Cancelar
              </Button>
              <Button type='submit' className='bg-primary font-medium'>
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: EDITAR MÉTODO DE PAGO */}
      {/* ======================================================== */}
      <Dialog open={editMethodModalOpen} onOpenChange={setEditMethodModalOpen}>
        <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Icons.creditCard className='h-5 w-5 text-primary' />
              <span>Editar Método de Pago: {selectedMethodForEdit?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Modifica los datos que tus clientes verán al momento de realizar el pago
            </DialogDescription>
          </DialogHeader>

          {selectedMethodForEdit && (
            <form onSubmit={handleSaveEditedPaymentMethod} className='space-y-4 py-2'>
              <div className='space-y-2'>
                <Label>Nombre del Método</Label>
                <Input
                  required
                  value={selectedMethodForEdit.name}
                  onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, name: e.target.value })}
                />
              </div>

              {/* Logo selector / uploader */}
              <div className='p-3 rounded-xl border border-border/60 bg-muted/20 space-y-3'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold'>Logo del Método</Label>
                  <div className='flex items-center gap-1.5'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='xs'
                      onClick={() => setSelectedMethodForEdit({ ...selectedMethodForEdit, logo_url: '/logos/zelle.svg' })}
                      className='text-[10px] px-1.5 py-0.5 h-6'
                    >
                      Zelle
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='xs'
                      onClick={() => setSelectedMethodForEdit({ ...selectedMethodForEdit, logo_url: '/logos/binance.svg' })}
                      className='text-[10px] px-1.5 py-0.5 h-6'
                    >
                      Binance
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='xs'
                      onClick={() => setSelectedMethodForEdit({ ...selectedMethodForEdit, logo_url: '/logos/bank.svg' })}
                      className='text-[10px] px-1.5 py-0.5 h-6'
                    >
                      Banco
                    </Button>
                  </div>
                </div>

                <div className='flex items-center gap-3'>
                  <div className='w-12 h-12 rounded-xl bg-slate-950 p-2 flex items-center justify-center shrink-0 border border-slate-800 shadow-inner'>
                    <img
                      src={selectedMethodForEdit.logo_url}
                      alt='Logo'
                      className='max-h-full max-w-full object-contain'
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logos/bank.svg';
                      }}
                    />
                  </div>
                  <div className='space-y-1.5 flex-1'>
                    <Input
                      type='file'
                      accept='image/*'
                      onChange={(e) => handleMethodLogoUpload(e, false)}
                      disabled={isUploadingMethodLogo}
                      className='text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-primary file:text-primary-foreground cursor-pointer'
                    />
                    <Input
                      value={selectedMethodForEdit.logo_url}
                      onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, logo_url: e.target.value })}
                      placeholder='O pega la URL del logo...'
                      className='text-xs font-mono text-muted-foreground'
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Fields based on Type */}
              {selectedMethodForEdit.type === 'zelle' && (
                <div className='space-y-3'>
                  <div className='space-y-2'>
                    <Label>Correo Electrónico para Zelle</Label>
                    <Input
                      type='email'
                      required
                      value={selectedMethodForEdit.account_email || ''}
                      onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, account_email: e.target.value })}
                      placeholder='pagos@tuempresa.com'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Nombre del Titular Registrado</Label>
                    <Input
                      required
                      value={selectedMethodForEdit.account_holder || ''}
                      onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, account_holder: e.target.value })}
                      placeholder='Nombre o Razón Social'
                    />
                  </div>
                </div>
              )}

              {selectedMethodForEdit.type === 'binance' && (
                <div className='space-y-3'>
                  <div className='space-y-2'>
                    <Label>Binance Pay ID / UID</Label>
                    <Input
                      value={selectedMethodForEdit.binance_id || ''}
                      onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, binance_id: e.target.value })}
                      placeholder='Ej: 84920193'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Red Cripto (Ej: USDT TRC-20, BEP-20)</Label>
                    <Input
                      value={selectedMethodForEdit.network || ''}
                      onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, network: e.target.value })}
                      placeholder='USDT (Red TRC-20)'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Dirección de Billetera (Wallet)</Label>
                    <Input
                      value={selectedMethodForEdit.wallet_address || ''}
                      onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, wallet_address: e.target.value })}
                      placeholder='TXyz1234567890...'
                      className='font-mono text-xs'
                    />
                  </div>
                </div>
              )}

              {(selectedMethodForEdit.type === 'bank_transfer' || selectedMethodForEdit.type === 'custom') && (
                <div className='space-y-3'>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='space-y-2'>
                      <Label>Banco / Plataforma</Label>
                      <Input
                        value={selectedMethodForEdit.bank_name || ''}
                        onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, bank_name: e.target.value })}
                        placeholder='Ej: Chase / Mercantil / PayPal'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label>Titular de la Cuenta</Label>
                      <Input
                        value={selectedMethodForEdit.account_holder || ''}
                        onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, account_holder: e.target.value })}
                        placeholder='Nombre o Empresa'
                      />
                    </div>
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='space-y-2'>
                      <Label>Número de Cuenta / Teléfono</Label>
                      <Input
                        value={selectedMethodForEdit.account_number || ''}
                        onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, account_number: e.target.value })}
                        placeholder='0134-0000-...'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label>Documento / RIF / Routing</Label>
                      <Input
                        value={selectedMethodForEdit.routing_number || ''}
                        onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, routing_number: e.target.value })}
                        placeholder='J-12345678-0 o ABA Routing'
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className='space-y-2'>
                <Label>Instrucciones de Pago / Nota para el Cliente</Label>
                <Textarea
                  rows={2}
                  value={selectedMethodForEdit.instructions || ''}
                  onChange={(e) => setSelectedMethodForEdit({ ...selectedMethodForEdit, instructions: e.target.value })}
                  placeholder='Ej: Indicar número de factura y enviar captura de pago a facturacion@empresa.com'
                />
              </div>

              <DialogFooter className='pt-2'>
                <Button type='button' variant='outline' onClick={() => setEditMethodModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type='submit' className='bg-primary font-bold'>
                  Guardar Cambios
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: CREAR MÉTODO PERSONALIZADO */}
      {/* ======================================================== */}
      <Dialog open={createMethodModalOpen} onOpenChange={setCreateMethodModalOpen}>
        <DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Icons.add className='h-5 w-5 text-primary' />
              <span>Nuevo Método de Pago Personalizado</span>
            </DialogTitle>
            <DialogDescription>
              Agrega una cuenta adicional (ej: Pago Móvil, PayPal, Bizum, o billetera cripto)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMethodSubmit} className='space-y-4 py-2'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label>Nombre del Método</Label>
                <Input
                  required
                  placeholder='Ej: Pago Móvil BDV / PayPal'
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                />
              </div>
              <div className='space-y-2'>
                <Label>Tipo de Canal</Label>
                <Select
                  value={newMethodType}
                  onValueChange={(val: any) => setNewMethodType(val)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='custom'>Personalizado / Billetera</SelectItem>
                    <SelectItem value='bank_transfer'>Banca / Transferencia</SelectItem>
                    <SelectItem value='binance'>Cripto / Binance</SelectItem>
                    <SelectItem value='zelle'>Zelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Logo selection / upload */}
            <div className='p-3 rounded-xl border border-border/60 bg-muted/20 space-y-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-semibold'>Logo / Ícono del Canal</Label>
                <div className='flex items-center gap-1.5'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='xs'
                    onClick={() => setNewMethodLogo('/logos/zelle.svg')}
                    className='text-[10px] px-1.5 py-0.5 h-6'
                  >
                    Zelle
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='xs'
                    onClick={() => setNewMethodLogo('/logos/binance.svg')}
                    className='text-[10px] px-1.5 py-0.5 h-6'
                  >
                    Binance
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='xs'
                    onClick={() => setNewMethodLogo('/logos/bank.svg')}
                    className='text-[10px] px-1.5 py-0.5 h-6'
                  >
                    Banco
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='xs'
                    onClick={() => setNewMethodLogo('/logos/crypto.svg')}
                    className='text-[10px] px-1.5 py-0.5 h-6'
                  >
                    Cripto
                  </Button>
                </div>
              </div>

              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-xl bg-slate-950 p-2 flex items-center justify-center shrink-0 border border-slate-800 shadow-inner'>
                  <img
                    src={newMethodLogo}
                    alt='Logo'
                    className='max-h-full max-w-full object-contain'
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logos/bank.svg';
                    }}
                  />
                </div>
                <div className='space-y-1.5 flex-1'>
                  <Input
                    type='file'
                    accept='image/*'
                    onChange={(e) => handleMethodLogoUpload(e, true)}
                    disabled={isUploadingMethodLogo}
                    className='text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-primary file:text-primary-foreground cursor-pointer'
                  />
                  <Input
                    value={newMethodLogo}
                    onChange={(e) => setNewMethodLogo(e.target.value)}
                    placeholder='O URL directa de Supabase / imagen...'
                    className='text-xs font-mono text-muted-foreground'
                  />
                </div>
              </div>
            </div>

            {/* Inputs based on type */}
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label>Banco / Red / Plataforma</Label>
                <Input
                  value={newMethodBank}
                  onChange={(e) => setNewMethodBank(e.target.value)}
                  placeholder='Ej: Banco de Venezuela / TRC20'
                />
              </div>
              <div className='space-y-2'>
                <Label>Titular de la Cuenta</Label>
                <Input
                  value={newMethodHolder}
                  onChange={(e) => setNewMethodHolder(e.target.value)}
                  placeholder='Nombre completo o Razón Social'
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label>Nº Cuenta / Teléfono / Correo</Label>
                <Input
                  value={newMethodAccount}
                  onChange={(e) => setNewMethodAccount(e.target.value)}
                  placeholder='0102-0000-... o 0414-...'
                />
              </div>
              <div className='space-y-2'>
                <Label>Cédula / RIF / Doc</Label>
                <Input
                  value={newMethodRouting}
                  onChange={(e) => setNewMethodRouting(e.target.value)}
                  placeholder='V-12345678 o J-12345678-0'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label>Instrucciones de Pago para el Cliente</Label>
              <Textarea
                rows={2}
                value={newMethodInstructions}
                onChange={(e) => setNewMethodInstructions(e.target.value)}
                placeholder='Ej: Enviar comprobante con número de referencia bancaria al asesor.'
              />
            </div>

            <DialogFooter className='pt-2'>
              <Button type='button' variant='outline' onClick={() => setCreateMethodModalOpen(false)}>
                Cancelar
              </Button>
              <Button type='submit' className='bg-primary font-bold'>
                Crear Método de Pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
