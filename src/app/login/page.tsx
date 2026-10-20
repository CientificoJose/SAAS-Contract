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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
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

  return (
    <div className='min-h-screen flex items-center justify-center bg-[#070b14] p-4 relative overflow-hidden'>
      {/* Background cyber electric glow */}
      <div className='absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none' />
      <div className='absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none' />

      <Card className='w-full max-w-md border-blue-900/40 bg-[#0d1322]/90 text-white shadow-2xl backdrop-blur-xl relative z-10'>
        <CardHeader className='text-center space-y-3 pb-6'>
          <div className='mx-auto flex justify-center mb-1'>
            <img
              src='/logo.svg'
              alt='ContractPress Logo'
              className='h-12 w-auto object-contain'
            />
          </div>
          <CardTitle className='text-xl font-bold tracking-tight text-white'>
            Acceso al Sistema
          </CardTitle>
          <CardDescription className='text-slate-400 text-xs'>
            Ingresa tus credenciales para administrar tus contratos y propuestas
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email' className='text-slate-300 text-xs font-medium'>Correo Electrónico</Label>
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
                <Label htmlFor='password' className='text-slate-300 text-xs font-medium'>Contraseña</Label>
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
      </Card>
    </div>
  );
}
