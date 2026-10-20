'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';

type AuthMode = 'login' | 'forgot_request' | 'forgot_confirm';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  // Mode: login, forgot_request, forgot_confirm
  const [mode, setMode] = useState<AuthMode>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error(error.message || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      toast.success('¡Bienvenido!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = resetEmail.trim();
    if (!clean) {
      toast.error('Por favor ingresa tu correo electrónico');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email: clean })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al solicitar código');
      }

      toast.success('¡Código enviado! Revisa tu bandeja de entrada o spam.');
      setMode('forgot_confirm');
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar código');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error('Ingresa el código de 6 dígitos que te llegó al correo');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al minímo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          email: resetEmail.trim(),
          code: otpCode.trim(),
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al restablecer contraseña');
      }

      toast.success('¡Contraseña restablecida con éxito! Ya puedes ingresar.');
      setEmail(resetEmail.trim());
      setPassword('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setMode('login');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar contraseña');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#070b14] p-4 relative overflow-hidden'>
      {/* Background cyber electric glow */}
      <div className='absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none' />
      <div className='absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none' />

      <Card className='w-full max-w-md border-blue-900/40 bg-[#0d1322]/90 text-white shadow-2xl backdrop-blur-xl relative z-10 transition-all'>
        <CardHeader className='text-center space-y-3 pb-6'>
          <div className='mx-auto flex justify-center mb-1'>
            <img
              src='/logo.svg'
              alt='ContractCloud Logo'
              className='h-12 w-auto object-contain'
            />
          </div>

          {mode === 'login' && (
            <>
              <CardTitle className='text-xl font-bold tracking-tight text-white'>
                Acceso al Sistema
              </CardTitle>
              <CardDescription className='text-slate-400 text-xs'>
                Ingresa tus credenciales para administrar tus contratos y propuestas
              </CardDescription>
            </>
          )}

          {mode === 'forgot_request' && (
            <>
              <CardTitle className='text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2'>
                <span>Recuperar Contraseña</span>
              </CardTitle>
              <CardDescription className='text-slate-400 text-xs'>
                Ingresa tu correo registrado para recibir un código de seguridad de 6 dígitos
              </CardDescription>
            </>
          )}

          {mode === 'forgot_confirm' && (
            <>
              <CardTitle className='text-xl font-bold tracking-tight text-white'>
                Código de Verificación
              </CardTitle>
              <CardDescription className='text-slate-400 text-xs'>
                Ingresa el código enviado a <strong className='text-blue-400'>{resetEmail}</strong> y tu nueva clave
              </CardDescription>
            </>
          )}
        </CardHeader>

        {/* ======================================================== */}
        {/* VIEW 1: LOGIN */}
        {/* ======================================================== */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email' className='text-slate-300 text-xs font-medium'>
                  Correo Electrónico
                </Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='tu@correo.com'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className='bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500'
                />
              </div>

              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='password' className='text-slate-300 text-xs font-medium'>
                    Contraseña
                  </Label>
                  <button
                    type='button'
                    onClick={() => {
                      setResetEmail(email);
                      setMode('forgot_request');
                    }}
                    className='text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer underline-offset-4 hover:underline'
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <Input
                  id='password'
                  type='password'
                  placeholder='••••••••'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className='bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500'
                />
              </div>
            </CardContent>

            <CardFooter className='flex flex-col gap-3 pt-2'>
              <Button
                type='submit'
                disabled={loading}
                className='w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg cursor-pointer transition-all shadow-lg shadow-blue-600/30'
              >
                {loading ? (
                  <div className='flex items-center gap-2'>
                    <Icons.spinner className='h-4 w-4 animate-spin' />
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
              <p className='text-[11px] text-slate-500 text-center mt-1'>
                Protegido con Supabase Auth & Dokploy • Contratos Digitales Inteligentes
              </p>
            </CardFooter>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: FORGOT PASSWORD REQUEST (SOLICITAR CÓDIGO) */}
        {/* ======================================================== */}
        {mode === 'forgot_request' && (
          <form onSubmit={handleRequestReset}>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='resetEmail' className='text-slate-300 text-xs font-medium'>
                  Correo Electrónico de tu cuenta
                </Label>
                <Input
                  id='resetEmail'
                  type='email'
                  placeholder='tu@correo.com'
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  autoFocus
                  className='bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500'
                />
              </div>
            </CardContent>

            <CardFooter className='flex flex-col gap-3 pt-2'>
              <Button
                type='submit'
                disabled={resetLoading}
                className='w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg cursor-pointer transition-all shadow-lg shadow-blue-600/30'
              >
                {resetLoading ? (
                  <div className='flex items-center gap-2'>
                    <Icons.spinner className='h-4 w-4 animate-spin' />
                    <span>Enviando código...</span>
                  </div>
                ) : (
                  'Enviar Código de Verificación'
                )}
              </Button>

              <button
                type='button'
                onClick={() => setMode('login')}
                className='text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-1'
              >
                ← Volver a Iniciar Sesión
              </button>
            </CardFooter>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: FORGOT PASSWORD CONFIRM (INGRESAR CÓDIGO + NUEVA CLAVE) */}
        {/* ======================================================== */}
        {mode === 'forgot_confirm' && (
          <form onSubmit={handleConfirmReset}>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='otpCode' className='text-slate-300 text-xs font-medium'>
                  Código de Seguridad (6 dígitos)
                </Label>
                <Input
                  id='otpCode'
                  type='text'
                  maxLength={6}
                  placeholder='123456'
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                  className='bg-slate-950/70 border-slate-800 text-white text-center text-xl font-mono tracking-widest placeholder:text-slate-600 focus-visible:ring-blue-500'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='newPassword' className='text-slate-300 text-xs font-medium'>
                  Nueva Contraseña (mínimo 6 caracteres)
                </Label>
                <Input
                  id='newPassword'
                  type='password'
                  placeholder='••••••••'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className='bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500'
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='confirmPassword' className='text-slate-300 text-xs font-medium'>
                  Confirmar Nueva Contraseña
                </Label>
                <Input
                  id='confirmPassword'
                  type='password'
                  placeholder='••••••••'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className='bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500'
                />
              </div>
            </CardContent>

            <CardFooter className='flex flex-col gap-3 pt-2'>
              <Button
                type='submit'
                disabled={resetLoading}
                className='w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg cursor-pointer transition-all shadow-lg shadow-blue-600/30'
              >
                {resetLoading ? (
                  <div className='flex items-center gap-2'>
                    <Icons.spinner className='h-4 w-4 animate-spin' />
                    <span>Restableciendo contraseña...</span>
                  </div>
                ) : (
                  'Restablecer Contraseña'
                )}
              </Button>

              <div className='flex items-center justify-between w-full text-xs text-slate-400 pt-1'>
                <button
                  type='button'
                  onClick={handleRequestReset}
                  disabled={resetLoading}
                  className='hover:text-blue-400 transition-colors cursor-pointer'
                >
                  Reenviar código
                </button>
                <button
                  type='button'
                  onClick={() => setMode('login')}
                  className='hover:text-white transition-colors cursor-pointer'
                >
                  Volver al Login
                </button>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
