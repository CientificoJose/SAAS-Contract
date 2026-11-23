'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  adminCreateUser,
  adminGenerateAccessToken,
  adminSetUserPassword,
  adminUpdateUserRole
} from '@/features/admin/api/actions';
import type { AdminOverviewData, AdminUserRecord } from '@/features/admin/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';

interface AdminDashboardClientProps {
  initialData: AdminOverviewData;
  currentAdminEmail: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'Nunca';
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso));
  } catch {
    return iso.split('T')[0] || iso;
  }
}

function generateReadablePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const symbols = '!@#$*';
  let result = 'Test';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += symbols.charAt(Math.floor(Math.random() * symbols.length));
  result += Math.floor(10 + Math.random() * 89);
  return result;
}

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copiado al portapapeles`);
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function AdminDashboardClient({
  initialData,
  currentAdminEmail
}: AdminDashboardClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');

  // Impersonation / 1-click access state
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);
  const [impersonateConfirmUser, setImpersonateConfirmUser] = useState<AdminUserRecord | null>(
    null
  );

  // User details modal
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<AdminUserRecord | null>(
    null
  );

  // Password testing modal
  const [passwordModalUser, setPasswordModalUser] = useState<AdminUserRecord | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [savedCredentialsPreview, setSavedCredentialsPreview] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [showSavedPassword, setShowSavedPassword] = useState(false);

  // Create user modal
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createTenantName, setCreateTenantName] = useState('');
  const [createRole, setCreateRole] = useState<'user' | 'admin'>('user');
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialData.users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q) ||
        u.tenant_name.toLowerCase().includes(q) ||
        u.proposals.some(
          (p) =>
            p.client_name.toLowerCase().includes(q) ||
            p.client_company.toLowerCase().includes(q) ||
            p.invoice_number.toLowerCase().includes(q)
        )
      );
    });
  }, [initialData.users, searchQuery, roleFilter]);

  const handleOpenPasswordModal = (user: AdminUserRecord) => {
    setPasswordModalUser(user);
    setNewPasswordInput(generateReadablePassword());
    setShowNewPassword(true);
    setSavedCredentialsPreview(null);
    setShowSavedPassword(false);
  };

  const handleSaveTestingPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (newPasswordInput.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsSavingPassword(true);
    try {
      await adminSetUserPassword(passwordModalUser.id, newPasswordInput);
      toast.success(`Contraseña de testing actualizada para ${passwordModalUser.email}`);
      setSavedCredentialsPreview({
        email: passwordModalUser.email,
        password: newPasswordInput
      });
      setShowSavedPassword(true);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al asignar contraseña'));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDirectLoginAsUser = async (targetUser: AdminUserRecord) => {
    setImpersonatingUserId(targetUser.id);
    try {
      const { email, token_hash } = await adminGenerateAccessToken(targetUser.id);
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'magiclink'
      });

      if (error) {
        throw new Error(error.message || 'No se pudo iniciar la sesión de testing');
      }

      toast.success(`Sesión iniciada como ${email} (Modo Testing)`);
      setImpersonateConfirmUser(null);
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al cambiar de sesión'));
      setImpersonatingUserId(null);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim() || !createPassword.trim()) {
      toast.error('Completa correo y contraseña');
      return;
    }

    setIsCreatingUser(true);
    try {
      await adminCreateUser({
        email: createEmail,
        password: createPassword,
        full_name: createFullName,
        tenant_name: createTenantName,
        role: createRole
      });
      toast.success(`Usuario ${createEmail} creado correctamente`);
      setCreateUserOpen(false);
      setCreateEmail('');
      setCreateFullName('');
      setCreateTenantName('');
      setCreatePassword('');
      router.refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Error al crear el usuario'));
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleRole = async (user: AdminUserRecord) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    if (
      !confirm(
        `¿Deseas cambiar el rol de "${user.email}" a ${nextRole === 'admin' ? 'SUPER ADMIN' : 'AGENCIA / USUARIO'}?`
      )
    ) {
      return;
    }

    setUpdatingRoleId(user.id);
    try {
      await adminUpdateUserRole(user.id, nextRole);
      toast.success('Rol actualizado correctamente');
      router.refresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'No se pudo cambiar el rol'));
    } finally {
      setUpdatingRoleId(null);
    }
  };

  return (
    <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8'>
      {/* Header Banner */}
      <div className='rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-card p-6 shadow-sm'>
        <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4'>
          <div className='space-y-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge className='bg-primary text-primary-foreground gap-1.5 px-2.5 py-0.5'>
                <Icons.shield className='h-3.5 w-3.5' />
                CENTRO SUPER ADMIN
              </Badge>
              <Badge variant='outline' className='font-mono text-xs'>
                Admin principal: {initialData.adminEmailConfigured}
              </Badge>
              <Badge variant='secondary' className='text-xs'>
                Sesión actual: {currentAdminEmail}
              </Badge>
            </div>
            <h1 className='text-2xl sm:text-3xl font-black tracking-tight text-foreground'>
              Gestión Global de Usuarios, Agencias &amp; Testing
            </h1>
            <p className='text-sm text-muted-foreground max-w-3xl'>
              Supervisa la información, propuestas, facturación y configuración de cada usuario en
              la plataforma. Accede en 1 clic a cualquier cuenta con su información ya incorporada o
              asigna contraseñas temporales visibles para probar el flujo completo de inicio de
              sesión.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2 shrink-0'>
            <Link href='/dashboard'>
              <Button variant='outline' className='gap-2 cursor-pointer'>
                <Icons.dashboard className='h-4 w-4' />
                Panel de Contratos
              </Button>
            </Link>
            <Button
              variant='outline'
              onClick={() => router.refresh()}
              className='gap-2 cursor-pointer'
              title='Actualizar métricas'
            >
              <Icons.refresh className='h-4 w-4' />
              Actualizar
            </Button>
            <Button
              onClick={() => {
                setCreatePassword(generateReadablePassword());
                setShowCreatePassword(true);
                setCreateUserOpen(true);
              }}
              className='gap-2 cursor-pointer shadow-sm'
            >
              <Icons.add className='h-4 w-4' />
              Nuevo Usuario / Agencia
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card className='border-border/60'>
          <CardHeader className='pb-2 flex flex-row items-center justify-between space-y-0'>
            <CardTitle className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Usuarios &amp; Agencias
            </CardTitle>
            <Icons.teams className='h-4 w-4 text-primary' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-black text-foreground'>
              {initialData.stats.total_users}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              {initialData.stats.total_agencies} agencias registradas
            </p>
          </CardContent>
        </Card>

        <Card className='border-border/60'>
          <CardHeader className='pb-2 flex flex-row items-center justify-between space-y-0'>
            <CardTitle className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Propuestas Totales
            </CardTitle>
            <Icons.fileText className='h-4 w-4 text-blue-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-black text-foreground'>
              {initialData.stats.total_proposals}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              {initialData.stats.total_signed} firmadas por clientes
            </p>
          </CardContent>
        </Card>

        <Card className='border-border/60'>
          <CardHeader className='pb-2 flex flex-row items-center justify-between space-y-0'>
            <CardTitle className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Volumen Cotizado
            </CardTitle>
            <Icons.trendingUp className='h-4 w-4 text-amber-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-black text-foreground'>
              $
              {initialData.stats.total_quoted_usd.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>Acumulado global USD</p>
          </CardContent>
        </Card>

        <Card className='border-border/60'>
          <CardHeader className='pb-2 flex flex-row items-center justify-between space-y-0'>
            <CardTitle className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Recaudado Confirmado
            </CardTitle>
            <Icons.creditCard className='h-4 w-4 text-emerald-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-black text-emerald-600 dark:text-emerald-400'>
              $
              {initialData.stats.total_collected_usd.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>Pagos reportados y verificados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Users Table */}
      <Card className='border-border/60 shadow-sm'>
        <CardHeader className='space-y-4'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <div>
              <CardTitle className='text-lg font-bold flex items-center gap-2'>
                <Icons.teams className='h-5 w-5 text-primary' />
                Directorio de Usuarios e Información Incorporada
              </CardTitle>
              <CardDescription>
                Haz clic en el ícono de ojo para explorar las propuestas de cada usuario, o en los
                accesos rápidos de testing para entrar con su cuenta.
              </CardDescription>
            </div>

            <div className='flex flex-col sm:flex-row gap-2 w-full md:w-auto'>
              <div className='relative flex-1 sm:w-64'>
                <Icons.search className='h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2' />
                <Input
                  placeholder='Buscar correo, agencia, cliente...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-9'
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(val) => setRoleFilter((val as 'all' | 'user' | 'admin') || 'all')}
              >
                <SelectTrigger className='w-full sm:w-40'>
                  <SelectValue placeholder='Filtrar rol' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos los roles</SelectItem>
                  <SelectItem value='user'>Solo Agencias</SelectItem>
                  <SelectItem value='admin'>Solo Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className='py-12 text-center text-muted-foreground text-sm'>
              No se encontraron usuarios que coincidan con tu búsqueda.
            </div>
          ) : (
            <div className='rounded-xl border border-border/60 overflow-x-auto'>
              <Table>
                <TableHeader className='bg-muted/40'>
                  <TableRow>
                    <TableHead>Usuario &amp; Agencia</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Información Incorporada</TableHead>
                    <TableHead>Volumen / Cobrado</TableHead>
                    <TableHead>Último Acceso</TableHead>
                    <TableHead className='text-right'>Testing &amp; Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const isMainAdmin = u.email === initialData.adminEmailConfigured;
                    return (
                      <TableRow key={u.id} className='hover:bg-muted/30 transition-colors'>
                        <TableCell>
                          <div className='flex items-center gap-3'>
                            <div
                              className='w-10 h-10 rounded-xl border border-border/60 bg-background p-1.5 flex items-center justify-center shrink-0 overflow-hidden'
                              style={{
                                borderTopWidth: '3px',
                                borderTopColor: u.brand_color_primary || '#0066FF'
                              }}
                            >
                              <Image
                                src={u.brand_logo_url || '/icon.svg'}
                                alt={u.tenant_name}
                                width={32}
                                height={32}
                                unoptimized
                                className='max-h-full max-w-full object-contain'
                              />
                            </div>
                            <div className='min-w-0'>
                              <div className='font-bold text-sm text-foreground flex items-center gap-1.5'>
                                <span className='truncate'>{u.full_name}</span>
                                {u.email_confirmed && (
                                  <span title='Correo verificado'>
                                    <Icons.circleCheck className='h-3.5 w-3.5 text-emerald-500 shrink-0' />
                                  </span>
                                )}
                              </div>
                              <div className='text-xs font-medium text-primary truncate'>
                                {u.tenant_name}
                              </div>
                              <div className='text-xs font-mono text-muted-foreground flex items-center gap-1'>
                                <span className='truncate'>{u.email}</span>
                                <button
                                  type='button'
                                  onClick={() => copyText(u.email, 'Correo')}
                                  className='text-muted-foreground hover:text-foreground cursor-pointer p-0.5'
                                  title='Copiar correo'
                                >
                                  <Icons.copy className='h-3 w-3' />
                                </button>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className='flex flex-col items-start gap-1'>
                            {u.role === 'admin' ? (
                              <Badge className='bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1'>
                                <Icons.pro className='h-3 w-3' />
                                SUPER ADMIN
                              </Badge>
                            ) : (
                              <Badge variant='secondary' className='gap-1'>
                                <Icons.user className='h-3 w-3' />
                                AGENCIA
                              </Badge>
                            )}
                            {!isMainAdmin && (
                              <button
                                type='button'
                                disabled={updatingRoleId === u.id}
                                onClick={() => handleToggleRole(u)}
                                className='text-[11px] text-muted-foreground hover:text-primary underline cursor-pointer disabled:opacity-50'
                              >
                                {updatingRoleId === u.id
                                  ? 'Actualizando...'
                                  : u.role === 'admin'
                                    ? 'Cambiar a Agencia'
                                    : 'Promover a Admin'}
                              </button>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className='space-y-1 text-xs'>
                            <div className='flex items-center gap-1.5 font-semibold text-foreground'>
                              <Icons.fileText className='h-3.5 w-3.5 text-blue-500' />
                              <span>{u.proposals_count} propuestas</span>
                              {u.signed_count > 0 && (
                                <Badge
                                  variant='outline'
                                  className='text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-500/40'
                                >
                                  {u.signed_count} firmadas
                                </Badge>
                              )}
                            </div>
                            <div className='flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground'>
                              <span>{u.payment_methods_count} métodos pago</span>
                              <span>•</span>
                              <span>{u.smtp_configured ? 'SMTP Propio' : 'SMTP Global'}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className='space-y-0.5 text-xs font-mono'>
                            <div className='font-bold text-foreground'>
                              ${u.total_quoted.toFixed(2)} USD
                            </div>
                            <div className='text-emerald-600 dark:text-emerald-400 text-[11px]'>
                              Cobrado: ${u.total_collected.toFixed(2)}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className='text-xs space-y-0.5'>
                            <div className='font-medium text-foreground'>
                              {formatDate(u.last_sign_in_at)}
                            </div>
                            <div className='text-[11px] text-muted-foreground'>
                              Registro: {u.created_at ? u.created_at.split('T')[0] : '-'}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className='text-right'>
                          <div className='flex items-center justify-end gap-1.5'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setSelectedUserForDetails(u)}
                              className='h-8 px-2.5 gap-1.5 text-xs cursor-pointer'
                              title='Ver propuestas y configuración de este usuario'
                            >
                              <Icons.eye className='h-3.5 w-3.5 text-blue-500' />
                              <span className='hidden xl:inline'>Ver Info</span>
                            </Button>

                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => handleOpenPasswordModal(u)}
                              className='h-8 px-2.5 gap-1.5 text-xs cursor-pointer'
                              title='Asignar y mostrar contraseña temporal de testing'
                            >
                              <Icons.key className='h-3.5 w-3.5 text-amber-500' />
                              <span className='hidden xl:inline'>Contraseña</span>
                            </Button>

                            <Button
                              variant='default'
                              size='sm'
                              disabled={impersonatingUserId === u.id}
                              onClick={() => setImpersonateConfirmUser(u)}
                              className='h-8 px-2.5 gap-1.5 text-xs cursor-pointer'
                              title='Acceder en 1 clic a esta cuenta para testing'
                            >
                              {impersonatingUserId === u.id ? (
                                <Icons.spinner className='h-3.5 w-3.5 animate-spin' />
                              ) : (
                                <Icons.login className='h-3.5 w-3.5' />
                              )}
                              <span>Acceder</span>
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

      {/* ======================================================== */}
      {/* MODAL: DETALLES E INFORMACIÓN INCORPORADA POR USUARIO */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(selectedUserForDetails)}
        onOpenChange={(open) => !open && setSelectedUserForDetails(null)}
      >
        <DialogContent className='max-w-3xl max-h-[85vh] overflow-y-auto'>
          {selectedUserForDetails && (
            <>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2.5'>
                  <Icons.user className='h-5 w-5 text-primary' />
                  <span>
                    {selectedUserForDetails.full_name} — {selectedUserForDetails.tenant_name}
                  </span>
                </DialogTitle>
                <DialogDescription className='font-mono text-xs'>
                  ID: {selectedUserForDetails.id} • {selectedUserForDetails.email}
                </DialogDescription>
              </DialogHeader>

              <div className='space-y-5 py-2 text-sm'>
                {/* Config Summary */}
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                  <div className='rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1'>
                    <div className='text-[11px] uppercase font-bold text-muted-foreground'>
                      Branding de Agencia
                    </div>
                    <div className='flex items-center gap-2 pt-1'>
                      <span
                        className='w-4 h-4 rounded-full border border-border'
                        style={{ backgroundColor: selectedUserForDetails.brand_color_primary }}
                        title='Color Primario'
                      />
                      <span
                        className='w-4 h-4 rounded-full border border-border'
                        style={{ backgroundColor: selectedUserForDetails.brand_color_secondary }}
                        title='Color Secundario'
                      />
                      <span className='text-xs font-mono'>
                        {selectedUserForDetails.brand_color_primary}
                      </span>
                    </div>
                  </div>

                  <div className='rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1'>
                    <div className='text-[11px] uppercase font-bold text-muted-foreground'>
                      Métodos &amp; Correo
                    </div>
                    <div className='text-xs font-semibold'>
                      {selectedUserForDetails.payment_methods_count} canales de pago activos
                    </div>
                    <div className='text-[11px] text-muted-foreground'>
                      {selectedUserForDetails.smtp_configured
                        ? 'SMTP propio configurado'
                        : 'Usa SMTP global de la plataforma'}
                    </div>
                  </div>

                  <div className='rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1'>
                    <div className='text-[11px] uppercase font-bold text-muted-foreground'>
                      Resumen Financiero
                    </div>
                    <div className='text-xs font-mono font-bold text-foreground'>
                      Cotizado: ${selectedUserForDetails.total_quoted.toFixed(2)} USD
                    </div>
                    <div className='text-xs font-mono text-emerald-600 dark:text-emerald-400'>
                      Cobrado: ${selectedUserForDetails.total_collected.toFixed(2)} USD
                    </div>
                  </div>
                </div>

                {/* Proposals list for this user */}
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                      Propuestas &amp; Contratos Incorporados (
                      {selectedUserForDetails.proposals.length})
                    </h4>
                  </div>

                  {selectedUserForDetails.proposals.length === 0 ? (
                    <div className='rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground'>
                      Este usuario aún no ha creado propuestas en la plataforma.
                    </div>
                  ) : (
                    <div className='rounded-xl border border-border/60 divide-y divide-border/40'>
                      {selectedUserForDetails.proposals.map((prop) => (
                        <div
                          key={prop.id}
                          className='p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20'
                        >
                          <div className='space-y-0.5'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <span className='font-bold text-sm text-foreground'>
                                {prop.client_company || prop.client_name}
                              </span>
                              <Badge variant='outline' className='font-mono text-[10px]'>
                                #{prop.invoice_number}
                              </Badge>
                              {prop.is_signed ? (
                                <Badge className='bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]'>
                                  Firmada
                                </Badge>
                              ) : (
                                <Badge variant='secondary' className='text-[10px]'>
                                  Sin firma
                                </Badge>
                              )}
                              <Badge variant='outline' className='text-[10px]'>
                                {prop.payment_status}
                              </Badge>
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              Cliente: {prop.client_name} • Monto:{' '}
                              <span className='font-mono font-semibold text-foreground'>
                                ${prop.price.toFixed(2)} USD
                              </span>{' '}
                              (Pagado: ${prop.payment_amount.toFixed(2)} USD)
                            </div>
                          </div>

                          <div className='flex items-center gap-1.5 shrink-0'>
                            <Link href={`/p/${prop.id}`} target='_blank'>
                              <Button
                                variant='outline'
                                size='sm'
                                className='h-7 text-xs gap-1 cursor-pointer'
                              >
                                <Icons.externalLink className='h-3 w-3' />
                                Portal
                              </Button>
                            </Link>
                            <Link href={`/dashboard/propuestas/${prop.id}/editar`}>
                              <Button
                                variant='outline'
                                size='sm'
                                className='h-7 text-xs gap-1 cursor-pointer'
                              >
                                <Icons.edit className='h-3 w-3 text-amber-500' />
                                Editar
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className='gap-2 sm:gap-0'>
                <Button
                  variant='outline'
                  onClick={() => {
                    const target = selectedUserForDetails;
                    setSelectedUserForDetails(null);
                    handleOpenPasswordModal(target);
                  }}
                  className='gap-1.5 cursor-pointer'
                >
                  <Icons.key className='h-4 w-4 text-amber-500' />
                  Contraseña Testing
                </Button>
                <Button
                  onClick={() => {
                    const target = selectedUserForDetails;
                    setSelectedUserForDetails(null);
                    setImpersonateConfirmUser(target);
                  }}
                  className='gap-1.5 cursor-pointer'
                >
                  <Icons.login className='h-4 w-4' />
                  Acceder como {selectedUserForDetails.full_name}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: ASIGNAR / MOSTRAR CONTRASEÑA PARA TESTING */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(passwordModalUser)}
        onOpenChange={(open) => !open && setPasswordModalUser(null)}
      >
        <DialogContent className='sm:max-w-lg'>
          {passwordModalUser && (
            <>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2'>
                  <Icons.key className='h-5 w-5 text-amber-500' />
                  Contraseña &amp; Acceso para Testing
                </DialogTitle>
                <DialogDescription>
                  Cuenta:{' '}
                  <span className='font-mono font-semibold text-foreground'>
                    {passwordModalUser.email}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className='space-y-4 py-2'>
                <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground/90 flex items-start gap-2.5'>
                  <Icons.info className='h-4 w-4 text-amber-500 shrink-0 mt-0.5' />
                  <div className='space-y-1'>
                    <p className='font-semibold'>Nota técnica de seguridad (Supabase Auth):</p>
                    <p className='text-muted-foreground leading-relaxed'>
                      Las contraseñas existentes están cifradas de forma irreversible en Supabase y
                      no pueden desencriptarse. Para hacer testing tienes 2 opciones inmediatas:
                    </p>
                    <ul className='list-disc list-inside text-muted-foreground space-y-0.5 pt-0.5'>
                      <li>
                        <strong>Opción A (Sin cambiar clave):</strong> Usa{' '}
                        <em>&quot;Acceder en 1 Clic&quot;</em> para iniciar sesión directo en esta
                        cuenta.
                      </li>
                      <li>
                        <strong>Opción B (Con contraseña visible):</strong> Asigna abajo una clave
                        temporal de testing para verla, copiarla y probar en <code>/login</code>.
                      </li>
                    </ul>
                  </div>
                </div>

                {!savedCredentialsPreview ? (
                  <form onSubmit={handleSaveTestingPassword} className='space-y-4'>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <Label htmlFor='testing-password-input'>
                          Nueva Contraseña de Testing (mín. 6 caracteres)
                        </Label>
                        <button
                          type='button'
                          onClick={() => {
                            setNewPasswordInput(generateReadablePassword());
                            setShowNewPassword(true);
                          }}
                          className='text-xs text-primary hover:underline font-medium cursor-pointer'
                        >
                          Generar aleatoria
                        </button>
                      </div>
                      <div className='relative flex items-center gap-2'>
                        <div className='relative flex-1'>
                          <Input
                            id='testing-password-input'
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            className='font-mono pr-10'
                            required
                            minLength={6}
                          />
                          <button
                            type='button'
                            onClick={() => setShowNewPassword((v) => !v)}
                            className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer'
                            title={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          >
                            {showNewPassword ? (
                              <Icons.eyeOff className='h-4 w-4' />
                            ) : (
                              <Icons.eye className='h-4 w-4' />
                            )}
                          </button>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          onClick={() => copyText(newPasswordInput, 'Contraseña')}
                          title='Copiar contraseña'
                          className='cursor-pointer shrink-0'
                        >
                          <Icons.copy className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>

                    <DialogFooter className='gap-2 sm:justify-between flex-col sm:flex-row'>
                      <Button
                        type='button'
                        variant='secondary'
                        onClick={() => {
                          const target = passwordModalUser;
                          setPasswordModalUser(null);
                          setImpersonateConfirmUser(target);
                        }}
                        className='gap-1.5 cursor-pointer'
                      >
                        <Icons.login className='h-4 w-4' />
                        Acceder sin cambiar clave
                      </Button>

                      <Button
                        type='submit'
                        disabled={isSavingPassword}
                        className='gap-1.5 cursor-pointer'
                      >
                        {isSavingPassword ? (
                          <Icons.spinner className='h-4 w-4 animate-spin' />
                        ) : (
                          <Icons.check className='h-4 w-4' />
                        )}
                        Aplicar Contraseña de Testing
                      </Button>
                    </DialogFooter>
                  </form>
                ) : (
                  <div className='space-y-4'>
                    <div className='rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3'>
                      <div className='flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm'>
                        <Icons.circleCheck className='h-4 w-4' />
                        Contraseña aplicada. Lista para hacer testing:
                      </div>

                      <div className='space-y-2 text-xs'>
                        <div className='flex items-center justify-between gap-2 bg-background/80 p-2.5 rounded-lg border border-border/60'>
                          <div>
                            <span className='text-muted-foreground block text-[10px] uppercase font-bold'>
                              Correo
                            </span>
                            <span className='font-mono font-bold text-foreground'>
                              {savedCredentialsPreview.email}
                            </span>
                          </div>
                          <Button
                            type='button'
                            size='sm'
                            variant='ghost'
                            onClick={() => copyText(savedCredentialsPreview.email, 'Correo')}
                            className='h-7 gap-1 cursor-pointer'
                          >
                            <Icons.copy className='h-3.5 w-3.5' />
                            Copiar
                          </Button>
                        </div>

                        <div className='flex items-center justify-between gap-2 bg-background/80 p-2.5 rounded-lg border border-border/60'>
                          <div>
                            <span className='text-muted-foreground block text-[10px] uppercase font-bold'>
                              Contraseña asignada
                            </span>
                            <span className='font-mono font-bold text-foreground'>
                              {showSavedPassword
                                ? savedCredentialsPreview.password
                                : '••••••••••••'}
                            </span>
                          </div>
                          <div className='flex items-center gap-1'>
                            <Button
                              type='button'
                              size='sm'
                              variant='ghost'
                              onClick={() => setShowSavedPassword((v) => !v)}
                              className='h-7 gap-1 cursor-pointer'
                            >
                              {showSavedPassword ? (
                                <>
                                  <Icons.eyeOff className='h-3.5 w-3.5' />
                                  Ocultar
                                </>
                              ) : (
                                <>
                                  <Icons.eye className='h-3.5 w-3.5' />
                                  Mostrar
                                </>
                              )}
                            </Button>
                            <Button
                              type='button'
                              size='sm'
                              variant='ghost'
                              onClick={() =>
                                copyText(savedCredentialsPreview.password, 'Contraseña')
                              }
                              className='h-7 gap-1 cursor-pointer'
                            >
                              <Icons.copy className='h-3.5 w-3.5' />
                              Copiar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => setPasswordModalUser(null)}
                        className='cursor-pointer'
                      >
                        Cerrar
                      </Button>
                      <Button
                        type='button'
                        onClick={() => {
                          const target = passwordModalUser;
                          setPasswordModalUser(null);
                          handleDirectLoginAsUser(target);
                        }}
                        className='gap-1.5 cursor-pointer'
                      >
                        <Icons.login className='h-4 w-4' />
                        Entrar directo ahora
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: CONFIRMACIÓN DE ACCESO DIRECTO (IMPERSONACIÓN) */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(impersonateConfirmUser)}
        onOpenChange={(open) => !open && setImpersonateConfirmUser(null)}
      >
        <DialogContent className='sm:max-w-md'>
          {impersonateConfirmUser && (
            <>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2'>
                  <Icons.login className='h-5 w-5 text-primary' />
                  Acceso Directo en Modo Testing
                </DialogTitle>
                <DialogDescription>
                  Vas a iniciar sesión directamente con la cuenta de{' '}
                  <strong className='text-foreground'>{impersonateConfirmUser.full_name}</strong> (
                  <span className='font-mono'>{impersonateConfirmUser.email}</span>).
                </DialogDescription>
              </DialogHeader>

              <div className='rounded-xl border border-border/60 bg-muted/40 p-3.5 text-xs space-y-2 text-muted-foreground'>
                <p>
                  • Podrás ver y probar sus{' '}
                  <strong>{impersonateConfirmUser.proposals_count} propuestas</strong>, su catálogo,
                  branding y métodos de pago tal como los ve el usuario.
                </p>
                <p>
                  • Su contraseña actual <strong>no será modificada</strong>.
                </p>
                <p>
                  • Cuando termines el testing, cierra sesión desde el menú superior para volver a
                  ingresar como Super Administrador.
                </p>
              </div>

              <DialogFooter className='gap-2 sm:gap-0'>
                <Button
                  variant='outline'
                  onClick={() => setImpersonateConfirmUser(null)}
                  className='cursor-pointer'
                >
                  Cancelar
                </Button>
                <Button
                  disabled={impersonatingUserId === impersonateConfirmUser.id}
                  onClick={() => handleDirectLoginAsUser(impersonateConfirmUser)}
                  className='gap-1.5 cursor-pointer'
                >
                  {impersonatingUserId === impersonateConfirmUser.id ? (
                    <Icons.spinner className='h-4 w-4 animate-spin' />
                  ) : (
                    <Icons.login className='h-4 w-4' />
                  )}
                  Entrar Ahora como Usuario
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: CREAR NUEVO USUARIO / AGENCIA */}
      {/* ======================================================== */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Icons.add className='h-5 w-5 text-primary' />
              Crear Nuevo Usuario / Agencia
            </DialogTitle>
            <DialogDescription>
              Crea una cuenta verificada lista para operar o hacer testing en el SaaS.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUserSubmit} className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='create-email'>Correo Electrónico *</Label>
              <Input
                id='create-email'
                type='email'
                required
                placeholder='agencia@ejemplo.com'
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='create-fullname'>Nombre Completo *</Label>
                <Input
                  id='create-fullname'
                  required
                  placeholder='Ej. María Pérez'
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='create-tenant'>Nombre de Agencia / Marca</Label>
                <Input
                  id='create-tenant'
                  placeholder='Ej. Estudio Digital'
                  value={createTenantName}
                  onChange={(e) => setCreateTenantName(e.target.value)}
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label>Rol en Plataforma</Label>
              <Select
                value={createRole}
                onValueChange={(val) => setCreateRole((val as 'user' | 'admin') || 'user')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='user'>Usuario / Agencia (Multi-tenant)</SelectItem>
                  <SelectItem value='admin'>Super Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='create-password'>Contraseña Inicial *</Label>
                <button
                  type='button'
                  onClick={() => {
                    setCreatePassword(generateReadablePassword());
                    setShowCreatePassword(true);
                  }}
                  className='text-xs text-primary hover:underline cursor-pointer'
                >
                  Generar aleatoria
                </button>
              </div>
              <div className='relative flex items-center gap-2'>
                <div className='relative flex-1'>
                  <Input
                    id='create-password'
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className='font-mono pr-10'
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                  />
                  <button
                    type='button'
                    onClick={() => setShowCreatePassword((v) => !v)}
                    className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer'
                  >
                    {showCreatePassword ? (
                      <Icons.eyeOff className='h-4 w-4' />
                    ) : (
                      <Icons.eye className='h-4 w-4' />
                    )}
                  </button>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  onClick={() => copyText(createPassword, 'Contraseña')}
                  className='cursor-pointer shrink-0'
                  title='Copiar contraseña'
                >
                  <Icons.copy className='h-4 w-4' />
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setCreateUserOpen(false)}
                className='cursor-pointer'
              >
                Cancelar
              </Button>
              <Button type='submit' disabled={isCreatingUser} className='gap-1.5 cursor-pointer'>
                {isCreatingUser ? (
                  <Icons.spinner className='h-4 w-4 animate-spin' />
                ) : (
                  <Icons.add className='h-4 w-4' />
                )}
                Crear Usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
