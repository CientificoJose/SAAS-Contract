'use client';

import React, { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { saveSignature } from '@/lib/actions';
import type {
  Proposal,
  Credential,
  ProposalService,
  ProposalPayment,
  ProposalCollaborator,
  PaymentMethodConfig
} from '@/lib/supabase/types';
import { SignatureBlock } from '@/components/proposals/signature-pad';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';

interface DynamicContractClientProps {
  proposal: Proposal;
  credentials: Credential[];
  services: ProposalService[];
  payments: ProposalPayment[];
  collaborators: ProposalCollaborator[];
  globalSettings?: Record<string, string>;
  creatorProfile?: {
    full_name?: string;
    tenant_name?: string;
    brand_logo_url?: string;
    brand_color_primary?: string;
    brand_color_secondary?: string;
  } | null;
  paymentMethods?: PaymentMethodConfig[];
}

type SignatureData = {
  image: string;
  recordedAtISO: string;
};

function PaymentMethodsGrid({
  methods,
  copyToClipboard
}: {
  methods: PaymentMethodConfig[];
  copyToClipboard: (text: string, label: string) => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (methods.length === 0) return null;

  const handleCopy = (text: string, label: string, key: string) => {
    copyToClipboard(text, label);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  const getCardTheme = (type: string) => {
    switch (type) {
      case 'zelle':
        return {
          topBorder: 'border-t-4 border-t-purple-600',
          badgeBg: 'bg-purple-100 text-purple-900 border-purple-200/80',
          badgeText: 'Transferencia USA',
          iconBg:
            'bg-gradient-to-br from-purple-900 to-slate-950 border-purple-800/60 shadow-purple-950/20',
          boxBorder: 'hover:border-purple-300',
          btnCopy: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200/60',
          highlightText: 'text-purple-700',
          infoBox: 'bg-purple-50/70 border-purple-100/90 text-purple-950',
          infoIcon: 'text-purple-600'
        };
      case 'binance':
        return {
          topBorder: 'border-t-4 border-t-amber-500',
          badgeBg: 'bg-amber-100 text-amber-950 border-amber-200/80',
          badgeText: 'Cripto / Web3',
          iconBg:
            'bg-gradient-to-br from-amber-950 to-slate-950 border-amber-800/60 shadow-amber-950/20',
          boxBorder: 'hover:border-amber-300',
          btnCopy: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200/60',
          highlightText: 'text-amber-600',
          infoBox: 'bg-amber-50/70 border-amber-100/90 text-amber-950',
          infoIcon: 'text-amber-600'
        };
      case 'bank_transfer':
        return {
          topBorder: 'border-t-4 border-t-sky-600',
          badgeBg: 'bg-sky-100 text-sky-900 border-sky-200/80',
          badgeText: 'Banca Tradicional',
          iconBg: 'bg-gradient-to-br from-sky-950 to-slate-950 border-sky-800/60 shadow-sky-950/20',
          boxBorder: 'hover:border-sky-300',
          btnCopy: 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200/60',
          highlightText: 'text-sky-700',
          infoBox: 'bg-sky-50/70 border-sky-100/90 text-sky-950',
          infoIcon: 'text-sky-600'
        };
      default:
        return {
          topBorder: 'border-t-4 border-t-slate-700',
          badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
          badgeText: 'Pago Digital',
          iconBg: 'bg-slate-950 border-slate-800',
          boxBorder: 'hover:border-slate-300',
          btnCopy: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200',
          highlightText: 'text-slate-900',
          infoBox: 'bg-slate-50 border-slate-200 text-slate-800',
          infoIcon: 'text-slate-600'
        };
    }
  };

  return (
    <section className='space-y-4'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80'>
        <div className='flex items-center gap-2.5'>
          <div className='p-2 bg-orange-100 text-orange-600 rounded-xl shadow-xs'>
            <Icons.creditCard className='h-5 w-5' />
          </div>
          <div>
            <h2 className='text-lg font-bold text-slate-900'>
              Canales y Cuentas Habilitadas para Pagos
            </h2>
            <p className='text-xs text-slate-500'>
              Datos completos para realizar transferencias directas o pagos digitales
            </p>
          </div>
        </div>
        <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 w-fit self-start sm:self-auto shadow-2xs'>
          <span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
          Cuentas Verificadas
        </span>
      </div>

      <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
        {methods.map((pm) => {
          const theme = getCardTheme(pm.type);

          return (
            <div
              key={pm.id}
              className={`bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden ${theme.topBorder}`}
            >
              <div className='p-5 space-y-4 flex-1 flex flex-col justify-between'>
                {/* Header del Método */}
                <div className='space-y-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <div
                        className={`w-12 h-12 rounded-xl p-2 flex items-center justify-center shrink-0 border shadow-inner ${theme.iconBg}`}
                      >
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
                        <h4 className='font-black text-base text-slate-900 tracking-tight leading-tight'>
                          {pm.name}
                        </h4>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border mt-1 ${theme.badgeBg}`}
                        >
                          {theme.badgeText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloques de Datos Completos (Sin cortes ni truncados) */}
                  <div className='space-y-2.5 pt-1'>
                    {/* Correo Electrónico (Zelle u otros) */}
                    {pm.account_email && (
                      <div
                        className={`rounded-xl p-3 bg-slate-50/70 border border-slate-200/90 transition-all ${theme.boxBorder}`}
                      >
                        <div className='flex items-center justify-between gap-1 mb-1.5'>
                          <span className='text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1'>
                            <Icons.mail className='h-3 w-3 text-slate-400' />
                            Correo Electrónico
                          </span>
                          <button
                            type='button'
                            onClick={() =>
                              handleCopy(pm.account_email!, 'Correo electrónico', `${pm.id}-email`)
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border ${
                              copiedKey === `${pm.id}-email`
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : `${theme.btnCopy}`
                            }`}
                            title='Copiar correo completo'
                          >
                            {copiedKey === `${pm.id}-email` ? (
                              <>
                                <Icons.check className='h-3.5 w-3.5 stroke-[2.5]' />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Icons.copy className='h-3 w-3' />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div
                          onClick={() =>
                            handleCopy(pm.account_email!, 'Correo electrónico', `${pm.id}-email`)
                          }
                          className='font-mono font-bold text-slate-900 text-xs sm:text-[13px] break-all select-all cursor-pointer hover:opacity-80 transition-opacity leading-snug'
                        >
                          {pm.account_email}
                        </div>
                      </div>
                    )}

                    {/* Número de Cuenta Bancaria */}
                    {pm.account_number && (
                      <div
                        className={`rounded-xl p-3 bg-slate-50/70 border border-slate-200/90 transition-all ${theme.boxBorder}`}
                      >
                        <div className='flex items-center justify-between gap-1 mb-1.5'>
                          <span className='text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1'>
                            <Icons.creditCard className='h-3 w-3 text-slate-400' />
                            Nº de Cuenta (Completo)
                          </span>
                          <button
                            type='button'
                            onClick={() =>
                              handleCopy(pm.account_number!, 'Número de cuenta', `${pm.id}-acc`)
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border ${
                              copiedKey === `${pm.id}-acc`
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : `${theme.btnCopy}`
                            }`}
                            title='Copiar número de cuenta completo'
                          >
                            {copiedKey === `${pm.id}-acc` ? (
                              <>
                                <Icons.check className='h-3.5 w-3.5 stroke-[2.5]' />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Icons.copy className='h-3 w-3' />
                                <span>Copiar Cuenta</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div
                          onClick={() =>
                            handleCopy(pm.account_number!, 'Número de cuenta', `${pm.id}-acc`)
                          }
                          className='font-mono font-bold text-slate-900 text-xs sm:text-[13px] break-all select-all cursor-pointer hover:opacity-80 transition-opacity leading-snug tracking-wide'
                        >
                          {pm.account_number}
                        </div>
                      </div>
                    )}

                    {/* Binance Pay ID */}
                    {pm.binance_id && (
                      <div className='rounded-xl p-3 bg-amber-50/80 border border-amber-200 shadow-2xs hover:border-amber-400 transition-all'>
                        <div className='flex items-center justify-between gap-1 mb-1.5'>
                          <span className='text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1'>
                            <Icons.sparkles className='h-3 w-3 text-amber-600' />
                            Binance Pay ID
                          </span>
                          <button
                            type='button'
                            onClick={() =>
                              handleCopy(pm.binance_id!, 'Binance Pay ID', `${pm.id}-payid`)
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border ${
                              copiedKey === `${pm.id}-payid`
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                            }`}
                            title='Copiar Pay ID'
                          >
                            {copiedKey === `${pm.id}-payid` ? (
                              <>
                                <Icons.check className='h-3.5 w-3.5 stroke-[2.5]' />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Icons.copy className='h-3 w-3' />
                                <span>Copiar ID</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div
                          onClick={() =>
                            handleCopy(pm.binance_id!, 'Binance Pay ID', `${pm.id}-payid`)
                          }
                          className='font-mono font-black text-amber-600 text-sm sm:text-base tracking-wider select-all cursor-pointer hover:text-amber-700 transition-colors'
                        >
                          {pm.binance_id}
                        </div>
                      </div>
                    )}

                    {/* Dirección de Billetera USDT / Cripto */}
                    {pm.wallet_address && (
                      <div
                        className={`rounded-xl p-3 bg-slate-50/70 border border-slate-200/90 transition-all ${theme.boxBorder}`}
                      >
                        <div className='flex items-center justify-between gap-1 mb-1.5'>
                          <span className='text-[10px] font-bold uppercase tracking-wider text-slate-500'>
                            {pm.wallet_address.includes('@')
                              ? 'Cuenta / Correo Binance'
                              : 'Billetera / Wallet Address'}
                          </span>
                          <button
                            type='button'
                            onClick={() =>
                              handleCopy(
                                pm.wallet_address!,
                                'Dirección o cuenta',
                                `${pm.id}-wallet`
                              )
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border ${
                              copiedKey === `${pm.id}-wallet`
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : `${theme.btnCopy}`
                            }`}
                            title='Copiar dirección completa'
                          >
                            {copiedKey === `${pm.id}-wallet` ? (
                              <>
                                <Icons.check className='h-3.5 w-3.5 stroke-[2.5]' />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Icons.copy className='h-3 w-3' />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div
                          onClick={() =>
                            handleCopy(pm.wallet_address!, 'Dirección o cuenta', `${pm.id}-wallet`)
                          }
                          className='font-mono font-bold text-slate-900 text-xs sm:text-[13px] break-all select-all cursor-pointer hover:opacity-80 transition-opacity leading-snug'
                        >
                          {pm.wallet_address}
                        </div>
                      </div>
                    )}

                    {/* Filas de Información Descriptiva (Banco, Titular, Doc/RIF, Red) */}
                    <div className='bg-slate-50/90 rounded-xl p-3 border border-slate-200/70 space-y-2 text-xs'>
                      {pm.bank_name && (
                        <div className='flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60'>
                          <span className='text-slate-500 font-medium'>Banco:</span>
                          <span className='font-bold text-slate-900 text-right'>
                            {pm.bank_name}
                          </span>
                        </div>
                      )}

                      {pm.account_holder && (
                        <div className='flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60 last:border-b-0 last:pb-0'>
                          <span className='text-slate-500 font-medium'>Titular:</span>
                          <span className='font-bold text-slate-900 text-right'>
                            {pm.account_holder}
                          </span>
                        </div>
                      )}

                      {pm.network && (
                        <div className='flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/60 last:border-b-0 last:pb-0'>
                          <span className='text-slate-500 font-medium'>Red Cripto:</span>
                          <span className='font-bold text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200/70'>
                            {pm.network}
                          </span>
                        </div>
                      )}

                      {pm.routing_number && (
                        <div className='flex items-center justify-between gap-2 pt-0.5'>
                          <span className='text-slate-500 font-medium'>Doc / RIF:</span>
                          <div className='flex items-center gap-1.5 font-mono font-bold text-slate-900'>
                            <span>{pm.routing_number}</span>
                            <button
                              type='button'
                              onClick={() =>
                                handleCopy(pm.routing_number!, 'Doc / RIF', `${pm.id}-rif`)
                              }
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                copiedKey === `${pm.id}-rif`
                                  ? 'text-emerald-600 bg-emerald-50'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                              }`}
                              title='Copiar documento'
                            >
                              {copiedKey === `${pm.id}-rif` ? (
                                <Icons.check className='h-3.5 w-3.5 stroke-[2.5]' />
                              ) : (
                                <Icons.copy className='h-3 w-3' />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {pm.phone_number && (
                        <div className='flex items-center justify-between gap-2 pt-0.5'>
                          <span className='text-slate-500 font-medium'>Teléfono:</span>
                          <div className='flex items-center gap-1.5 font-mono font-bold text-slate-900'>
                            <span>{pm.phone_number}</span>
                            <button
                              type='button'
                              onClick={() =>
                                handleCopy(pm.phone_number!, 'Teléfono', `${pm.id}-tel`)
                              }
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                copiedKey === `${pm.id}-tel`
                                  ? 'text-emerald-600 bg-emerald-50'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
                              }`}
                              title='Copiar teléfono'
                            >
                              {copiedKey === `${pm.id}-tel` ? (
                                <Icons.check className='h-3.5 w-3.5 stroke-[2.5]' />
                              ) : (
                                <Icons.copy className='h-3 w-3' />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nota / Instrucciones de Pago */}
                {pm.instructions && (
                  <div
                    className={`mt-3 flex items-start gap-2.5 p-3 rounded-xl border text-xs leading-relaxed ${theme.infoBox}`}
                  >
                    <Icons.info className={`h-4 w-4 shrink-0 mt-0.5 ${theme.infoIcon}`} />
                    <p className='font-normal text-slate-700'>{pm.instructions}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function DynamicContractClient({
  proposal,
  credentials,
  services,
  payments,
  collaborators,
  globalSettings = {},
  creatorProfile,
  paymentMethods = []
}: DynamicContractClientProps) {
  const [activeTab, setActiveTab] = useState('servicios');

  const activePaymentMethods = (paymentMethods || []).filter((pm) => pm.enabled);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`${label} copiado al portapapeles`);
    } else {
      toast.info(text);
    }
  };

  // Dynamic branding colors & identity
  const brandName = creatorProfile?.tenant_name || globalSettings.brand_name || 'ContractCloud';
  const primaryColor =
    proposal.brand_color_primary ||
    creatorProfile?.brand_color_primary ||
    globalSettings.color_primary ||
    '#0066FF';
  const secondaryColor =
    proposal.brand_color_secondary ||
    creatorProfile?.brand_color_secondary ||
    globalSettings.color_secondary ||
    '#00F0FF';

  const rawLogo =
    proposal.brand_logo_url && proposal.brand_logo_url !== '/recurso.png'
      ? proposal.brand_logo_url
      : creatorProfile?.brand_logo_url && creatorProfile?.brand_logo_url !== '/recurso.png'
        ? creatorProfile.brand_logo_url
        : globalSettings.brand_logo ||
          'https://contract-db.press-cloud.com/storage/v1/object/public/contract-assets/branding/logo.svg';

  const [currentLogo, setCurrentLogo] = useState<string>(rawLogo);
  const [logoFailed, setLogoFailed] = useState(false);

  const displayFriendlyDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.split('T')[0].split('-').map(Number);
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return dateStr;
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [savingSignature, setSavingSignature] = useState(false);

  const [dbSignature, setDbSignature] = useState<SignatureData | null>(
    proposal.signature_image
      ? {
          image: proposal.signature_image,
          recordedAtISO: proposal.signature_date || new Date().toISOString()
        }
      : null
  );

  const searchParams = useSearchParams();
  const clearMode = searchParams.get('clear') === 'true';
  const showSignaturePad = !dbSignature || clearMode;
  const isSigned = !!dbSignature && !clearMode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initializeCanvas = () => {
      const context = canvas.getContext('2d');
      if (!context) return;

      const ratio = window.devicePixelRatio || 1;
      const { clientWidth, clientHeight } = canvas;

      canvas.width = clientWidth * ratio;
      canvas.height = clientHeight * ratio;

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(ratio, ratio);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = 2.5;
      context.strokeStyle = '#0f172a';
    };

    initializeCanvas();
    const handleResize = () => {
      initializeCanvas();
      setHasStrokes(false);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showSignaturePad]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const getCanvasCoordinates = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    setIsDrawing(true);
    setHasStrokes(true);
    const { x, y } = getCanvasCoordinates(event);
    context.beginPath();
    context.moveTo(x, y);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const { x, y } = getCanvasCoordinates(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const handlePointerUp = () => setIsDrawing(false);
  const handlePointerCancel = () => setIsDrawing(false);
  const handlePointerLeave = () => isDrawing && setIsDrawing(false);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) {
      setStatusMessage({ type: 'error', text: 'Por favor, dibuja tu firma antes de guardar.' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    setSavingSignature(true);
    try {
      const dataURL = canvas.toDataURL('image/png');
      const nowISO = new Date().toISOString();
      await saveSignature(proposal.id, dataURL, nowISO);

      setDbSignature({
        image: dataURL,
        recordedAtISO: new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });

      // Launch celebration confetti
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      setStatusMessage({
        type: 'success',
        text: '¡Firma guardada y contrato formalizado con éxito!'
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: 'error', text: 'Error al registrar la firma en el servidor.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setSavingSignature(false);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    setStatusMessage(null);
  };

  const advisorContactName =
    creatorProfile?.full_name ||
    creatorProfile?.tenant_name ||
    globalSettings.brand_name ||
    'Administración';

  const resolvedServices: ProposalService[] =
    services && services.length > 0
      ? services
      : proposal.service_name
        ? [
            {
              id: `${proposal.id}-srv-1`,
              proposal_id: proposal.id,
              category_name: proposal.category_name || 'Servicios Profesionales',
              service_name: proposal.service_name,
              plan_name: proposal.plan_name || 'Plan Personalizado',
              price: Number(proposal.price) || 0,
              billing_type:
                proposal.duration?.toLowerCase().includes('único') ||
                proposal.duration?.toLowerCase().includes('unico')
                  ? 'ONE_TIME'
                  : 'RECURRENT',
              billing_cycle: proposal.duration || 'Mensual',
              features: proposal.features || '',
              policies: '',
              status: 'ACTIVO',
              start_date:
                proposal.start_date ||
                proposal.created_at?.split('T')[0] ||
                new Date().toISOString().split('T')[0],
              expiration_date: proposal.service_expiration || '',
              domain_included: proposal.domain_included ? 1 : 0,
              domain_expiration: proposal.domain_expiration || ''
            }
          ]
        : [];

  const totalProposalAmount =
    resolvedServices.length > 0
      ? resolvedServices.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0)
      : Number(proposal.price) || 0;

  const oneTimeAmount = resolvedServices
    .filter((s) => s.billing_type === 'ONE_TIME')
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  const recurrentAmount = resolvedServices
    .filter((s) => s.billing_type === 'RECURRENT')
    .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  const isRecurrent =
    resolvedServices.some((s) => s.billing_type === 'RECURRENT') ||
    (proposal.duration &&
      !proposal.duration.toLowerCase().includes('único') &&
      !proposal.duration.toLowerCase().includes('unico'));
  const pendingCuota = payments.find((p) => p.status === 'PENDIENTE');

  return (
    <div className='min-h-screen bg-slate-100 py-8 print:bg-white print:py-0 text-slate-800 font-sans'>
      {/* Dynamic Branding Injection */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        :root {
          --primary-contract: ${primaryColor};
          --secondary-contract: ${secondaryColor};
        }
        .text-contract-primary { color: var(--primary-contract) !important; }
        .bg-contract-primary { background-color: var(--primary-contract) !important; }
        .border-contract-primary { border-color: var(--primary-contract) !important; }
        
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 10.5pt !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 1.5cm;
          }
          section, tr, .border, .card {
            page-break-inside: avoid !important;
          }
        }
      `
        }}
      />

      <div className='container mx-auto max-w-4xl px-4 print:px-0'>
        {/* Floating Action Bar */}
        <div className='mb-6 flex justify-between items-center print:hidden'>
          <button
            type='button'
            onClick={handlePrint}
            className='rounded-xl bg-orange-600 hover:bg-orange-500 px-6 py-2.5 font-bold text-white text-sm transition cursor-pointer shadow-lg flex items-center gap-2'
          >
            <Icons.post className='h-4 w-4' />
            <span>Imprimir / Descargar PDF</span>
          </button>

          {isSigned ? (
            pendingCuota ? (
              <div className='bg-amber-50 border border-amber-300 text-amber-900 text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-2 shadow-sm'>
                <span className='w-2 h-2 rounded-full bg-amber-500 animate-ping' />
                <span>Renovación de Periodo Pendiente</span>
              </div>
            ) : (
              <div className='bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-2 shadow-sm'>
                <span className='w-2 h-2 rounded-full bg-emerald-500 animate-ping' />
                <span>Contrato Activo y Vigente</span>
              </div>
            )
          ) : (
            <div className='bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-2 shadow-sm'>
              <span className='w-2 h-2 rounded-full bg-amber-500' />
              <span>Pendiente de Firma</span>
            </div>
          )}
        </div>

        {/* MAIN DOCUMENT CARD */}
        <div className='rounded-2xl bg-white p-6 md:p-10 shadow-xl print:shadow-none border border-slate-200/80'>
          {/* HEADER */}
          <div className='mb-8 border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <div>
              <h1 className='text-3xl font-black text-slate-900 tracking-tight'>
                {isSigned
                  ? 'Portal de Seguimiento del Contrato'
                  : 'Propuesta de Servicios Comerciales'}
              </h1>
              <p className='mt-1.5 text-sm text-slate-500'>
                Identificador: #{proposal.invoice_number} • {proposal.client_company}
              </p>
            </div>
            <div className='flex flex-col items-center sm:items-end'>
              {!logoFailed && currentLogo ? (
                <img
                  src={currentLogo}
                  alt={brandName}
                  className='h-10 w-auto object-contain max-w-[180px]'
                  onError={() => {
                    if (currentLogo !== '/logo.svg') {
                      setCurrentLogo('/logo.svg');
                    } else {
                      setLogoFailed(true);
                    }
                  }}
                />
              ) : (
                <div className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200'>
                  <span className='text-sm font-black tracking-tight text-slate-800'>
                    {brandName}
                  </span>
                </div>
              )}
              <p className='mt-1 text-xs font-bold text-slate-700'>{brandName}</p>
            </div>
          </div>

          {/* DATOS PROVEEDOR & CLIENTE */}
          <div className='mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200/60'>
            <div>
              <h3 className='text-xs font-bold text-slate-400 uppercase tracking-wider mb-1'>
                Proveedor
              </h3>
              <p className='text-sm font-bold text-slate-900'>{brandName}</p>
              <p className='text-xs text-slate-500'>Servicios y Soluciones Digitales</p>
            </div>
            <div>
              <h3 className='text-xs font-bold text-slate-400 uppercase tracking-wider mb-1'>
                Cliente Titular
              </h3>
              <p className='text-sm font-bold text-slate-900'>{proposal.client_name}</p>
              <p className='text-xs text-slate-600 font-medium'>{proposal.client_company}</p>
              {proposal.client_domain ? (
                <p className='text-xs text-orange-600 font-mono mt-0.5'>{proposal.client_domain}</p>
              ) : null}
            </div>
          </div>

          {/* CLIENT PORTAL (IF SIGNED) */}
          {isSigned ? (
            <div className='space-y-6'>
              {/* VIP RENEWAL BANNER */}
              {pendingCuota ? (
                <div className='rounded-2xl border-2 border-amber-400 bg-amber-50/85 p-5 md:p-6 shadow-md relative overflow-hidden'>
                  <div className='absolute left-0 top-0 bottom-0 w-2.5 bg-amber-500' />
                  <div className='flex flex-col md:flex-row md:items-center justify-between gap-5'>
                    <div className='space-y-2'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className='px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 flex items-center gap-1.5'>
                          <span className='w-2 h-2 rounded-full bg-amber-600 animate-ping' />
                          Cuota de Renovación Lista para Pago
                        </span>
                        {pendingCuota.invoice_number ? (
                          <span className='text-xs font-mono font-bold text-slate-500'>
                            #{pendingCuota.invoice_number}
                          </span>
                        ) : null}
                      </div>
                      <h3 className='text-xl font-black text-slate-900'>
                        {pendingCuota.description || 'Renovación de Servicios Digitales'}
                      </h3>
                      <p className='text-xs text-slate-600 max-w-xl leading-relaxed'>
                        Tu contrato marco se encuentra activo y formalizado. Para mantener tus
                        servicios y accesos en funcionamiento ininterrumpido, por favor realiza el
                        abono mediante cualquiera de los canales habilitados.
                      </p>
                      {pendingCuota.due_date ? (
                        <p className='text-xs text-amber-900 font-semibold flex items-center gap-1.5'>
                          <Icons.calendar className='h-3.5 w-3.5 text-amber-700' />
                          <span>
                            Fecha límite de pago:{' '}
                            <strong>{displayFriendlyDate(pendingCuota.due_date)}</strong>
                          </span>
                        </p>
                      ) : null}
                    </div>

                    <div className='flex flex-col sm:items-end justify-center shrink-0 border-t md:border-t-0 md:border-l border-amber-200 pt-3 md:pt-0 md:pl-6 space-y-2.5'>
                      <div className='text-left md:text-right'>
                        <span className='text-[10px] uppercase tracking-wider font-bold text-slate-500 block'>
                          Monto a Transferir
                        </span>
                        <span className='text-3xl font-black text-slate-900 text-contract-primary'>
                          ${Number(pendingCuota.amount).toFixed(2)} USD
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <button
                          type='button'
                          onClick={() => setActiveTab('pagos')}
                          className='bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer'
                        >
                          <Icons.creditCard className='h-4 w-4' />
                          <span>Ver Cuentas de Pago</span>
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Hola ${advisorContactName}, envío comprobante de renovación para ${proposal.client_company} por $${Number(pendingCuota.amount).toFixed(2)} USD (#${pendingCuota.invoice_number || proposal.invoice_number}).`
                          )}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition shadow flex items-center gap-1 cursor-pointer'
                          title='Reportar pago por WhatsApp'
                        >
                          <Icons.chat className='h-4 w-4' />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* TABS */}
              <div className='flex border-b border-slate-200 print:hidden'>
                <button
                  type='button'
                  onClick={() => setActiveTab('servicios')}
                  className={`py-2.5 px-4 font-bold text-sm border-b-2 transition cursor-pointer ${
                    activeTab === 'servicios'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Servicios y Accesos
                </button>
                <button
                  type='button'
                  onClick={() => setActiveTab('pagos')}
                  className={`py-2.5 px-4 font-bold text-sm border-b-2 transition cursor-pointer ${
                    activeTab === 'pagos'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isRecurrent ? 'Suscripción y Pagos' : 'Historial de Pagos'}
                  {pendingCuota ? (
                    <span className='ml-2 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold'>
                      1
                    </span>
                  ) : null}
                </button>
                {collaborators.length > 0 ? (
                  <button
                    type='button'
                    onClick={() => setActiveTab('colaboradores')}
                    className={`py-2.5 px-4 font-bold text-sm border-b-2 transition cursor-pointer ${
                      activeTab === 'colaboradores'
                        ? 'border-orange-600 text-orange-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Colaboradores
                  </button>
                ) : null}
              </div>

              {/* TAB 1: SERVICIOS Y ACCESOS */}
              {activeTab === 'servicios' && (
                <div className='space-y-6'>
                  <div className='grid gap-4 md:grid-cols-2'>
                    {resolvedServices.map((ser, idx) => (
                      <div
                        key={ser.id || idx}
                        className='border border-slate-200 rounded-xl p-5 bg-white shadow-sm relative overflow-hidden'
                      >
                        <div className='absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500' />
                        <div className='flex justify-between items-start mb-2'>
                          <div>
                            <span className='text-[10px] text-slate-400 font-bold uppercase tracking-wider'>
                              {ser.category_name}
                            </span>
                            <h4 className='font-bold text-base text-slate-900'>
                              {ser.service_name}
                            </h4>
                          </div>
                          <span className='text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800'>
                            Activo
                          </span>
                        </div>

                        <div className='text-xs text-slate-600 space-y-1 mb-4'>
                          <div>
                            Plan: <strong>{ser.plan_name || 'Estándar'}</strong>
                          </div>
                          <div>
                            Inversión: <strong>${Number(ser.price).toFixed(2)} USD</strong>
                          </div>
                          <div>
                            Modalidad:{' '}
                            <strong>
                              {ser.billing_type === 'RECURRENT'
                                ? `Recurrente (${ser.billing_cycle || 'Anual'})`
                                : 'Proyecto de Pago Único'}
                            </strong>
                          </div>
                        </div>

                        {ser.features ? (
                          <div className='mb-4 pt-2 border-t border-slate-100'>
                            <h5 className='text-[10px] text-slate-400 font-bold uppercase mb-1.5'>
                              Alcance Incluido
                            </h5>
                            <ul className='space-y-1 text-xs text-slate-600'>
                              {ser.features.split('\n').map((f, fIdx) => (
                                <li key={fIdx} className='flex gap-1.5 items-start'>
                                  <span className='text-emerald-500 font-bold'>✓</span>
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {ser.category_policies || ser.policies ? (
                          <div className='mb-4 p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 border border-slate-200/60 space-y-1'>
                            <h5 className='font-bold text-slate-800 text-[10px] uppercase'>
                              Términos y SLA:
                            </h5>
                            {ser.category_policies && <p>{ser.category_policies}</p>}
                            {ser.policies && <p>{ser.policies}</p>}
                          </div>
                        ) : null}

                        {ser.billing_type === 'RECURRENT' ? (
                          <div className='pt-3 border-t border-slate-100 text-[10px] space-y-1'>
                            <div className='text-slate-400'>
                              Inicio: {displayFriendlyDate(ser.start_date)}
                            </div>
                            <div className='flex items-center justify-between'>
                              <span className='text-slate-600'>
                                Vigencia / Renovación:{' '}
                                <strong>{displayFriendlyDate(ser.expiration_date)}</strong>
                              </span>
                              {pendingCuota ? (
                                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300'>
                                  Renovación Pendiente
                                </span>
                              ) : (
                                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800'>
                                  Al Día / Vigente
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className='pt-3 border-t border-slate-100 text-[10px] flex items-center justify-between'>
                            <span className='text-slate-500'>
                              Inicio: {displayFriendlyDate(ser.start_date)}
                            </span>
                            <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200'>
                              Proyecto de Pago Único
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* CREDENCIALES DEL CLIENTE */}
                  {credentials.length > 0 ? (
                    <div className='mt-8 border-t border-slate-200 pt-6'>
                      <h3 className='font-bold text-lg text-slate-900 mb-3 flex items-center gap-2'>
                        <span>🔐</span>
                        <span>Credenciales y Accesos Exclusivos</span>
                      </h3>
                      <div className='bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-6 grid gap-4 md:grid-cols-2'>
                        {credentials.map((cred, idx) => (
                          <div
                            key={idx}
                            className='bg-white border border-slate-200 p-4 rounded-xl shadow-sm'
                          >
                            <h4 className='font-bold text-sm text-slate-800 mb-2 border-b border-slate-100 pb-1.5'>
                              {cred.description}
                            </h4>
                            <div className='space-y-2 text-xs'>
                              <div className='flex justify-between text-slate-500'>
                                <span>Usuario:</span>
                                <span className='font-mono text-slate-900 font-bold select-all'>
                                  {cred.email}
                                </span>
                              </div>
                              <div className='flex justify-between text-slate-500'>
                                <span>Contraseña:</span>
                                <span className='font-mono text-slate-900 font-bold select-all'>
                                  {cred.password}
                                </span>
                              </div>
                              {cred.notes ? (
                                <p className='text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded'>
                                  {cred.notes}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 2: PAGOS */}
              {activeTab === 'pagos' && (
                <div className='space-y-6'>
                  {pendingCuota && (
                    <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                      <div>
                        <span className='text-[10px] font-black uppercase text-amber-800 tracking-wider'>
                          Cuota Actual por Renovar
                        </span>
                        <h4 className='font-bold text-sm text-slate-900'>
                          {pendingCuota.description || 'Renovación de Servicio'}
                        </h4>
                        <p className='text-xs text-slate-600'>
                          Monto:{' '}
                          <strong className='text-contract-primary'>
                            ${Number(pendingCuota.amount).toFixed(2)} USD
                          </strong>
                          {pendingCuota.due_date
                            ? ` • Fecha Límite: ${displayFriendlyDate(pendingCuota.due_date)}`
                            : ''}
                        </p>
                      </div>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Hola ${advisorContactName}, envío reporte de pago de renovación de ${proposal.client_company} por $${Number(pendingCuota.amount).toFixed(2)} USD (#${pendingCuota.invoice_number || proposal.invoice_number}).`
                        )}`}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow flex items-center gap-1.5 self-start sm:self-auto cursor-pointer'
                      >
                        <Icons.chat className='h-3.5 w-3.5' />
                        <span>Reportar por WhatsApp</span>
                      </a>
                    </div>
                  )}

                  <div className='border border-slate-200 rounded-xl overflow-hidden shadow-sm'>
                    <Table>
                      <TableHeader className='bg-slate-50'>
                        <TableRow>
                          <TableHead className='font-bold text-slate-800'>
                            Recibo / Factura
                          </TableHead>
                          <TableHead className='font-bold text-slate-800'>
                            Concepto / Periodo
                          </TableHead>
                          <TableHead className='font-bold text-slate-800'>Monto</TableHead>
                          <TableHead className='font-bold text-slate-800'>
                            Fecha / Vencimiento
                          </TableHead>
                          <TableHead className='font-bold text-slate-800'>Método</TableHead>
                          <TableHead className='font-bold text-slate-800'>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className='text-center py-8 text-slate-400'>
                              No hay registros de pagos archivados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          payments.map((pay, i) => {
                            const isPending = pay.status === 'PENDIENTE';
                            return (
                              <TableRow key={pay.id || i} className='text-xs'>
                                <TableCell className='font-bold font-mono'>
                                  {pay.invoice_number || proposal.invoice_number}
                                </TableCell>
                                <TableCell className='text-slate-800 font-medium'>
                                  {pay.description || 'Cuota de servicio'}
                                </TableCell>
                                <TableCell
                                  className={`font-bold ${isPending ? 'text-amber-600' : 'text-emerald-600'}`}
                                >
                                  ${Number(pay.amount).toFixed(2)} USD
                                </TableCell>
                                <TableCell className='text-slate-600'>
                                  {isPending
                                    ? pay.due_date
                                      ? `Vence: ${displayFriendlyDate(pay.due_date)}`
                                      : 'Pendiente'
                                    : displayFriendlyDate(pay.payment_date)}
                                </TableCell>
                                <TableCell className='text-slate-600'>
                                  {pay.payment_method ||
                                    (isPending ? 'Por definir' : 'Transferencia')}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isPending
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {pay.status || 'PAGADO'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Canales y Métodos de Pago Habilitados dentro del Portal */}
                  <PaymentMethodsGrid
                    methods={activePaymentMethods}
                    copyToClipboard={copyToClipboard}
                  />
                </div>
              )}

              {/* TAB 3: COLABORADORES */}
              {activeTab === 'colaboradores' && (
                <div className='space-y-4'>
                  <h3 className='font-bold text-lg text-slate-900'>Equipo Especialista Asignado</h3>
                  <div className='grid gap-4 md:grid-cols-2'>
                    {collaborators.map((col, idx) => (
                      <div
                        key={idx}
                        className='border border-slate-200 rounded-xl p-4 bg-white flex items-center gap-3'
                      >
                        <div className='w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-orange-600'>
                          {col.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className='font-bold text-sm'>{col.name}</h4>
                          <p className='text-xs text-slate-500'>{col.role || 'Especialista'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* PROPUESTA PENDIENTE DE FIRMA */
            <div className='space-y-8'>
              {/* SERVICIOS PROPUESTOS */}
              <section className='space-y-4'>
                <h2 className='text-xl font-bold text-slate-900 flex items-center gap-2'>
                  <Icons.folder className='h-5 w-5 text-orange-600' />
                  <span>Servicios Incluidos en la Propuesta</span>
                </h2>
                <div className='space-y-4'>
                  {resolvedServices.map((ser, idx) => (
                    <div
                      key={ser.id || idx}
                      className='border border-slate-200 rounded-xl p-5 bg-white shadow-sm'
                    >
                      <div className='flex justify-between items-start mb-2'>
                        <div>
                          <div className='flex items-center gap-2 mb-1'>
                            <span className='text-[10px] text-slate-400 font-bold uppercase tracking-wider'>
                              {ser.category_name}
                            </span>
                            {ser.billing_type === 'ONE_TIME' ? (
                              <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200'>
                                ⚡ Pago Único / Proyecto
                              </span>
                            ) : (
                              <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200'>
                                🔄 Recurrente ({ser.billing_cycle || 'Anual'})
                              </span>
                            )}
                          </div>
                          <h4 className='font-bold text-base text-slate-900'>{ser.service_name}</h4>
                        </div>
                        <span className='text-sm font-bold text-orange-600'>
                          ${Number(ser.price).toFixed(2)} USD
                        </span>
                      </div>
                      <p className='text-xs text-slate-600 mb-3'>
                        Plan: {ser.plan_name} (
                        {ser.billing_type === 'RECURRENT'
                          ? `Suscripción ${ser.billing_cycle || 'Anual'}`
                          : 'Pago Único'}
                        )
                      </p>

                      {ser.features ? (
                        <div className='pt-2 border-t border-slate-100 space-y-1'>
                          <ul className='space-y-1 text-xs text-slate-600'>
                            {ser.features.split('\n').map((f, fIdx) => (
                              <li key={fIdx} className='flex gap-1.5 items-start'>
                                <span className='text-emerald-500 font-bold'>✓</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {ser.category_policies || ser.policies ? (
                        <div className='mt-3 p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 space-y-1'>
                          <h5 className='font-bold text-slate-800 text-[10px] uppercase'>
                            Términos de Servicio:
                          </h5>
                          {ser.category_policies && <p>{ser.category_policies}</p>}
                          {ser.policies && <p>{ser.policies}</p>}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              {/* RESUMEN DE COBRO */}
              <section className='space-y-4'>
                <h2 className='text-xl font-bold text-slate-900 flex items-center gap-2'>
                  <Icons.creditCard className='h-5 w-5 text-orange-600' />
                  <span>Resumen de Cobro y Facturación</span>
                </h2>
                <div className='grid gap-6 grid-cols-1 md:grid-cols-2'>
                  <div className='border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col justify-between bg-white'>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between text-slate-500'>
                        <span>Factura Comercial:</span>
                        <span className='font-bold text-slate-900'>#{proposal.invoice_number}</span>
                      </div>
                      <div className='flex justify-between text-slate-500'>
                        <span>Moneda:</span>
                        <span className='font-bold text-slate-900'>USD</span>
                      </div>
                      <div className='flex justify-between text-slate-500'>
                        <span>Método de Pago Sugerido:</span>
                        <span className='font-bold text-slate-900'>
                          {proposal.payment_method || 'Transferencia'}
                        </span>
                      </div>
                    </div>

                    <div className='border-t border-slate-100 pt-4 flex justify-between items-center'>
                      <span className='font-bold text-slate-800 text-sm'>Inversión Total:</span>
                      <span className='text-2xl font-black text-orange-600'>
                        ${totalProposalAmount.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  <div className='border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2.5 bg-white'>
                    <h3 className='text-xs font-bold text-slate-700 uppercase tracking-wider'>
                      Cronograma de Cuotas
                    </h3>
                    <div className='space-y-2'>
                      {payments.map((pay, i) => (
                        <div
                          key={pay.id || i}
                          className='bg-white p-2.5 border border-slate-200 rounded-lg text-xs space-y-1'
                        >
                          <div className='flex justify-between items-center'>
                            <span className='font-bold text-slate-800'>{pay.description}</span>
                            <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800'>
                              {pay.status || 'PENDIENTE'}
                            </span>
                          </div>
                          <div className='flex justify-between text-slate-500 text-[11px]'>
                            <span>
                              Monto:{' '}
                              <strong className='text-slate-800'>
                                ${Number(pay.amount).toFixed(2)} USD
                              </strong>
                            </span>
                            <span>
                              {pay.due_date ? `Vence: ${displayFriendlyDate(pay.due_date)}` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* CANALES Y MÉTODOS DE PAGO HABILITADOS */}
              <PaymentMethodsGrid
                methods={activePaymentMethods}
                copyToClipboard={copyToClipboard}
              />

              {/* FIRMA BLOCK */}
              <SignatureBlock
                showSignaturePad={showSignaturePad}
                canvasRef={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onPointerLeave={handlePointerLeave}
                onSave={handleSave}
                onClear={handleClear}
                statusMessage={statusMessage}
                signatureImage={dbSignature?.image}
                signatureHolderName={proposal.client_name}
                signatureDate={dbSignature?.recordedAtISO}
                saveDisabled={!hasStrokes || savingSignature}
                clearDisabled={!hasStrokes || savingSignature}
                isSignatureLocked={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
