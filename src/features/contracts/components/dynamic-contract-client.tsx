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
  ProposalCollaborator
} from '@/lib/supabase/types';
import { SignatureBlock } from '@/components/proposals/signature-pad';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icons } from '@/components/icons';

interface DynamicContractClientProps {
  proposal: Proposal;
  credentials: Credential[];
  services: ProposalService[];
  payments: ProposalPayment[];
  collaborators: ProposalCollaborator[];
  globalSettings?: Record<string, string>;
}

type SignatureData = {
  image: string;
  recordedAtISO: string;
};

export function DynamicContractClient({
  proposal,
  credentials,
  services,
  payments,
  collaborators,
  globalSettings = {}
}: DynamicContractClientProps) {
  const [activeTab, setActiveTab] = useState('servicios');

  // Dynamic branding colors
  const primaryColor = proposal.brand_color_primary || globalSettings.color_primary || '#ff6600';
  const secondaryColor = proposal.brand_color_secondary || globalSettings.color_secondary || '#0f172a';
  const logoUrl = proposal.brand_logo_url || globalSettings.brand_logo || '/recurso.png';
  const brandName = globalSettings.brand_name || 'Sin Límites';

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
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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

      setStatusMessage({ type: 'success', text: '¡Firma guardada y contrato formalizado con éxito!' });
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

  const totalProposalAmount = services.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  const isRecurrent = services.some((s) => s.billing_type === 'RECURRENT');

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
            <div className='bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-2 shadow-sm'>
              <span className='w-2 h-2 rounded-full bg-emerald-500 animate-ping' />
              <span>Contrato Activo y Firmado</span>
            </div>
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
                {isSigned ? 'Portal de Seguimiento del Contrato' : 'Propuesta de Servicios Comerciales'}
              </h1>
              <p className='mt-1.5 text-sm text-slate-500'>
                Identificador: #{proposal.invoice_number} • {proposal.client_company}
              </p>
            </div>
            <div className='flex flex-col items-center sm:items-end'>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className='h-10 w-auto object-contain max-w-[160px]'
                />
              ) : null}
              <p className='mt-1 text-xs font-bold text-slate-700'>{brandName}</p>
            </div>
          </div>

          {/* DATOS PROVEEDOR & CLIENTE */}
          <div className='mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200/60'>
            <div>
              <h3 className='text-xs font-bold text-slate-400 uppercase tracking-wider mb-1'>Proveedor</h3>
              <p className='text-sm font-bold text-slate-900'>{brandName}</p>
              <p className='text-xs text-slate-500'>Servicios y Soluciones Digitales</p>
            </div>
            <div>
              <h3 className='text-xs font-bold text-slate-400 uppercase tracking-wider mb-1'>Cliente Titular</h3>
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
                    {services.map((ser, idx) => (
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
                            <h4 className='font-bold text-base text-slate-900'>{ser.service_name}</h4>
                          </div>
                          <span className='text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800'>
                            Activo
                          </span>
                        </div>

                        <div className='text-xs text-slate-600 space-y-1 mb-4'>
                          <div>Plan: <strong>{ser.plan_name || 'Estándar'}</strong></div>
                          <div>Inversión: <strong>${Number(ser.price).toFixed(2)} USD</strong></div>
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
                          <div className='pt-3 border-t border-slate-100 text-[10px] text-slate-400 space-y-0.5'>
                            <div>Inicio: {displayFriendlyDate(ser.start_date)}</div>
                            <div>Vigencia / Renovación: {displayFriendlyDate(ser.expiration_date)}</div>
                          </div>
                        ) : null}
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
                          <div key={idx} className='bg-white border border-slate-200 p-4 rounded-xl shadow-sm'>
                            <h4 className='font-bold text-sm text-slate-800 mb-2 border-b border-slate-100 pb-1.5'>
                              {cred.description}
                            </h4>
                            <div className='space-y-2 text-xs'>
                              <div className='flex justify-between text-slate-500'>
                                <span>Usuario:</span>
                                <span className='font-mono text-slate-900 font-bold select-all'>{cred.email}</span>
                              </div>
                              <div className='flex justify-between text-slate-500'>
                                <span>Contraseña:</span>
                                <span className='font-mono text-slate-900 font-bold select-all'>{cred.password}</span>
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
                <div className='space-y-4'>
                  <div className='border border-slate-200 rounded-xl overflow-hidden shadow-sm'>
                    <Table>
                      <TableHeader className='bg-slate-50'>
                        <TableRow>
                          <TableHead className='font-bold text-slate-800'>Recibo / Factura</TableHead>
                          <TableHead className='font-bold text-slate-800'>Monto</TableHead>
                          <TableHead className='font-bold text-slate-800'>Fecha</TableHead>
                          <TableHead className='font-bold text-slate-800'>Método</TableHead>
                          <TableHead className='font-bold text-slate-800'>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className='text-center py-8 text-slate-400'>
                              No hay registros de pagos archivados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          payments.map((pay, i) => (
                            <TableRow key={pay.id || i} className='text-xs'>
                              <TableCell className='font-bold'>{pay.invoice_number || proposal.invoice_number}</TableCell>
                              <TableCell className='font-bold text-emerald-600'>${Number(pay.amount).toFixed(2)} USD</TableCell>
                              <TableCell className='text-slate-600'>{displayFriendlyDate(pay.payment_date)}</TableCell>
                              <TableCell className='text-slate-600'>{pay.payment_method}</TableCell>
                              <TableCell>
                                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800'>
                                  {pay.status || 'PAGADO'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* TAB 3: COLABORADORES */}
              {activeTab === 'colaboradores' && (
                <div className='space-y-4'>
                  <h3 className='font-bold text-lg text-slate-900'>Equipo Especialista Asignado</h3>
                  <div className='grid gap-4 md:grid-cols-2'>
                    {collaborators.map((col, idx) => (
                      <div key={idx} className='border border-slate-200 rounded-xl p-4 bg-white flex items-center gap-3'>
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
                  {services.map((ser, idx) => (
                    <div key={ser.id || idx} className='border border-slate-200 rounded-xl p-5 bg-white shadow-sm'>
                      <div className='flex justify-between items-start mb-2'>
                        <div>
                          <span className='text-[10px] text-slate-400 font-bold uppercase tracking-wider'>
                            {ser.category_name}
                          </span>
                          <h4 className='font-bold text-base text-slate-900'>{ser.service_name}</h4>
                        </div>
                        <span className='text-sm font-bold text-orange-600'>${Number(ser.price).toFixed(2)} USD</span>
                      </div>
                      <p className='text-xs text-slate-600 mb-3'>
                        Plan: {ser.plan_name} ({ser.billing_type === 'RECURRENT' ? `Suscripción ${ser.billing_cycle || 'Anual'}` : 'Pago Único'})
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
                          <h5 className='font-bold text-slate-800 text-[10px] uppercase'>Términos de Servicio:</h5>
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
                        <span className='font-bold text-slate-900'>{proposal.payment_method || 'Transferencia'}</span>
                      </div>
                    </div>

                    <div className='border-t border-slate-100 pt-4 flex justify-between items-center'>
                      <span className='font-bold text-slate-800 text-sm'>Inversión Total:</span>
                      <span className='text-2xl font-black text-orange-600'>${totalProposalAmount.toFixed(2)} USD</span>
                    </div>
                  </div>

                  <div className='border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2.5 bg-white'>
                    <h3 className='text-xs font-bold text-slate-700 uppercase tracking-wider'>
                      Cronograma de Cuotas
                    </h3>
                    <div className='space-y-2'>
                      {payments.map((pay, i) => (
                        <div key={pay.id || i} className='bg-white p-2.5 border border-slate-200 rounded-lg text-xs space-y-1'>
                          <div className='flex justify-between items-center'>
                            <span className='font-bold text-slate-800'>{pay.description}</span>
                            <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800'>
                              {pay.status || 'PENDIENTE'}
                            </span>
                          </div>
                          <div className='flex justify-between text-slate-500 text-[11px]'>
                            <span>Monto: <strong className='text-slate-800'>${Number(pay.amount).toFixed(2)} USD</strong></span>
                            <span>{pay.due_date ? `Vence: ${displayFriendlyDate(pay.due_date)}` : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

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
