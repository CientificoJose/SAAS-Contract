'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logoutAction } from '@/lib/actions';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  brandName = 'ContractCloud',
  brandLogo = 'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg',
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
      await supabase.auth.signOut().catch(() => {});
      await logoutAction().catch(() => {});
    } catch (err) {
      console.warn('Logout notice:', err);
    } finally {
      toast.success('Sesión cerrada correctamente');
      window.location.href = '/login';
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
                className='h-8 w-auto max-w-[180px] object-contain rounded transition-transform group-hover:scale-105'
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.svg';
                }}
              />
            ) : (
              <div className='flex items-center gap-2'>
                <div className='w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-500 font-bold'>
                  ⚡
                </div>
                <span className='font-bold text-lg leading-tight tracking-tight'>
                  {brandName}
                </span>
              </div>
            )}
          </Link>

          {isUserAdmin ? (
            <Badge variant='outline' className='ml-2 bg-blue-500/10 text-blue-500 border-blue-500/30 font-semibold text-[11px] px-2 py-0.5 shadow-sm'>
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
              className='flex items-center gap-2 pl-2 pr-3 py-1.5 h-auto rounded-full border border-border/50 hover:bg-muted/50 cursor-pointer bg-background/60 text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-blue-500'
            >
              <Avatar className='h-7 w-7 text-xs bg-blue-600/20 text-blue-500 font-bold border border-blue-500/30'>
                <AvatarFallback>
                  {currentUserEmail ? currentUserEmail.substring(0, 2).toUpperCase() : 'CP'}
                </AvatarFallback>
              </Avatar>
              <span className='text-xs font-medium max-w-[140px] truncate hidden sm:inline-block'>
                {currentUserEmail}
              </span>
              <Icons.chevronDown className='h-3.5 w-3.5 text-muted-foreground' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56 mt-1 z-50 shadow-xl border border-border/60 bg-popover/95 backdrop-blur-md'>
              <DropdownMenuGroup>
                <DropdownMenuLabel className='font-normal'>
                  <div className='flex flex-col space-y-1'>
                    <p className='text-xs font-semibold leading-none text-foreground'>
                      {isUserAdmin ? 'Super Administrador' : 'Usuario de Agencia'}
                    </p>
                    <p className='text-xs leading-none text-muted-foreground truncate'>
                      {currentUserEmail}
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className='text-xs cursor-pointer'
                  onClick={() => router.push('/dashboard/propuestas/crear')}
                >
                  <Icons.add className='mr-2 h-4 w-4 text-blue-500' />
                  Nueva Propuesta
                </DropdownMenuItem>
                <DropdownMenuItem
                  className='text-xs cursor-pointer'
                  onClick={() => router.push('/dashboard')}
                >
                  <Icons.dashboard className='mr-2 h-4 w-4' />
                  Panel de Control
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className='text-xs text-destructive focus:text-destructive cursor-pointer'
                  onClick={handleLogout}
                >
                  <Icons.logout className='mr-2 h-4 w-4' />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
