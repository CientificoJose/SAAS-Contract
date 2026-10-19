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
    <div className='min-h-screen flex items-center justify-center bg-slate-950 p-4'>
      <Card className='w-full max-w-md border-slate-800 bg-slate-900/90 text-white shadow-2xl backdrop-blur-xl'>
        <CardHeader className='text-center space-y-2 pb-6'>
          <div className='mx-auto w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-500 font-bold text-xl mb-2'>
            ⚡
          </div>
          <CardTitle className='text-2xl font-bold tracking-tight text-white'>
            Contract Press Cloud
          </CardTitle>
          <CardDescription className='text-slate-400'>
            Ingresa tus credenciales para acceder al panel de gestión
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email' className='text-slate-300'>Correo Electrónico</Label>
              <Input
                id='email'
                type='email'
                placeholder='tu@correo.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className='bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-orange-500'
              />
            </div>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='password' className='text-slate-300'>Contraseña</Label>
              </div>
              <Input
                id='password'
                type='password'
                placeholder='••••••••'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className='bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-orange-500'
              />
            </div>
          </CardContent>
          <CardFooter className='flex flex-col gap-3 pt-2'>
            <Button
              type='submit'
              disabled={loading}
              className='w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-2 rounded-lg cursor-pointer transition-colors'
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
            <p className='text-xs text-slate-500 text-center'>
              Acceso seguro protegido con Supabase Auth & Dokploy
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
