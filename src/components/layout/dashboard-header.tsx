'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ThemeModeToggle } from '@/components/themes/theme-mode-toggle';
import { ThemeSelector } from '@/components/themes/theme-selector';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';

interface DashboardHeaderProps {
  brandName?: string;
  brandLogo?: string;
  userEmail?: string;
  isAdmin?: boolean;
}

export function DashboardHeader({
  brandName = 'Press Cloud',
  brandLogo = '/recurso.png',
  userEmail = 'qijoos3niievsik@gmail.com',
  isAdmin = true
}: DashboardHeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [currentUserEmail, setCurrentUserEmail] = useState(userEmail);
  const [isUserAdmin, setIsUserAdmin] = useState(isAdmin);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setCurrentUserEmail(user.email);
        setIsUserAdmin(user.email === 'qijoos3niievsik@gmail.com');
      }
    });
  }, [supabase]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Sesión cerrada');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <header className='sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur-md'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4'>
        {/* Brand / Logo */}
        <div className='flex items-center gap-3'>
          <Link href='/dashboard' className='flex items-center gap-3 group'>
            {brandLogo ? (
              <img
                src={brandLogo}
                alt='Logo'
                className='h-8 w-8 object-contain rounded transition-transform group-hover:scale-105'
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            <div className='flex flex-col'>
              <span className='font-bold text-lg leading-tight tracking-tight'>
                {brandName}
              </span>
              <span className='text-[10px] text-muted-foreground uppercase tracking-wider font-semibold'>
                Gestión de Contratos
              </span>
            </div>
          </Link>

          {isUserAdmin ? (
            <Badge variant='outline' className='ml-2 bg-orange-500/10 text-orange-500 border-orange-500/30 font-semibold text-[11px] px-2 py-0.5'>
              ADMIN
            </Badge>
          ) : (
            <Badge variant='outline' className='ml-2 text-muted-foreground text-[11px] px-2 py-0.5'>
              AGENCIA
            </Badge>
          )}
        </div>

        {/* Right actions: Theme + User menu */}
        <div className='flex items-center gap-2 sm:gap-3'>
          <ThemeModeToggle />
          <div className='hidden md:block'>
            <ThemeSelector />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant='ghost' size='sm' className='flex items-center gap-2 pl-2 pr-3 py-1.5 h-auto rounded-full border border-border/50 hover:bg-muted/50 cursor-pointer' />
              }
            >
              <Avatar className='h-7 w-7 text-xs bg-primary/20 text-primary font-bold'>
                <AvatarFallback>
                  {currentUserEmail ? currentUserEmail.substring(0, 2).toUpperCase() : 'AD'}
                </AvatarFallback>
              </Avatar>
              <span className='text-xs font-medium max-w-[140px] truncate hidden sm:inline-block'>
                {currentUserEmail}
              </span>
              <Icons.chevronDown className='h-3.5 w-3.5 text-muted-foreground' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56 mt-1'>
              <DropdownMenuLabel className='font-normal'>
                <div className='flex flex-col space-y-1'>
                  <p className='text-xs font-semibold leading-none text-foreground'>
                    {isUserAdmin ? 'Administrador General' : 'Usuario de Agencia'}
                  </p>
                  <p className='text-xs leading-none text-muted-foreground truncate'>
                    {currentUserEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-xs cursor-pointer'
                onClick={() => router.push('/dashboard/propuestas/crear')}
              >
                <Icons.add className='mr-2 h-4 w-4' />
                Nueva Propuesta
              </DropdownMenuItem>
              <DropdownMenuItem
                className='text-xs cursor-pointer'
                onClick={() => router.push('/dashboard')}
              >
                <Icons.dashboard className='mr-2 h-4 w-4' />
                Panel de Control
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-xs text-destructive focus:text-destructive cursor-pointer'
                onClick={handleLogout}
              >
                <Icons.logout className='mr-2 h-4 w-4' />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
