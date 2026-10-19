'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from '@/components/icons';

type StatusMessage = {
  type: 'success' | 'error';
  text: string;
} | null;

type SignatureBlockProps = {
  showSignaturePad: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onPointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onSave: () => void;
  onClear: () => void;
  statusMessage: StatusMessage;
  signatureImage?: string | null;
  signatureHolderName: string;
  signatureDate?: string | null;
  saveDisabled: boolean;
  clearDisabled: boolean;
  isSignatureLocked: boolean;
};

export function SignatureBlock({
  showSignaturePad,
  canvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  onSave,
  onClear,
  statusMessage,
  signatureImage,
  signatureHolderName,
  signatureDate,
  saveDisabled,
  clearDisabled,
  isSignatureLocked
}: SignatureBlockProps): React.ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isModalOpen]);

  const handleSaveAndClose = () => {
    onSave();
    setIsModalOpen(false);
  };

  return (
    <section className='mt-8 md:mt-10 bg-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl'>
      <h3 className='text-lg md:text-xl font-bold mb-3'>Aceptación & Firma Digital</h3>

      {!signatureImage && (
        <p className='text-sm text-slate-300 mb-4'>
          Para aceptar esta propuesta comercial y formalizar el contrato, haz clic en el botón de abajo para firmar digitalmente.
        </p>
      )}

      <div className='bg-white text-slate-900 rounded-xl p-4'>
        {!signatureImage && showSignaturePad && (
          <button
            type='button'
            onClick={() => setIsModalOpen(true)}
            className='w-full py-3.5 px-6 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition print:hidden cursor-pointer shadow-lg flex items-center justify-center gap-2'
          >
            <span>✍️</span>
            <span>Abrir Panel de Firma Digital</span>
          </button>
        )}

        {statusMessage && (
          <p
            className={`no-print mt-3 text-sm font-medium ${
              statusMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {statusMessage.text}
          </p>
        )}

        {signatureImage && (
          <div className='border border-slate-200 rounded-xl p-4 bg-slate-50'>
            <h4 className='font-bold text-slate-900 mb-2 text-sm'>Registro de Aceptación Legal</h4>
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
              <div>
                <p className='text-xs text-slate-500'>Firmado legalmente por</p>
                <p className='text-base font-bold text-slate-900'>{signatureHolderName}</p>
                {signatureDate && (
                  <p className='text-xs text-slate-500 mt-0.5'>{signatureDate}</p>
                )}
              </div>
              <div className='shrink-0 bg-white p-2 rounded-lg border border-slate-200 shadow-sm'>
                <img
                  src={signatureImage}
                  alt={`Firma digital de ${signatureHolderName}`}
                  className='max-h-20 object-contain'
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Firma */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:hidden'>
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden'>
            <div className='bg-slate-100 border-b border-slate-200 px-5 py-4 flex items-center justify-between'>
              <h4 className='text-base font-bold text-slate-900 flex items-center gap-2'>
                <span>✍️</span>
                <span>Firma Digital del Cliente</span>
              </h4>
              <button
                type='button'
                onClick={() => setIsModalOpen(false)}
                className='p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition cursor-pointer'
                aria-label='Cerrar'
              >
                <Icons.close className='h-5 w-5' />
              </button>
            </div>

            <div className='p-6 space-y-4'>
              <p className='text-xs text-slate-600'>
                Dibuja tu firma en el recuadro usando tu mouse, dedo o lápiz digital. Tu firma quedará legalmente vinculada a este contrato con sello de tiempo.
              </p>

              <div className='border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50'>
                <canvas
                  ref={canvasRef}
                  className={`w-full h-56 touch-none bg-white cursor-crosshair ${
                    isSignatureLocked ? 'pointer-events-none opacity-75' : ''
                  }`}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                  onPointerLeave={onPointerLeave}
                  style={{ touchAction: 'none' }}
                />
              </div>

              <div className='flex items-center justify-between gap-3 pt-2'>
                <button
                  type='button'
                  onClick={onClear}
                  disabled={clearDisabled}
                  className='px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer'
                >
                  Limpiar Firma
                </button>
                <div className='flex gap-2'>
                  <button
                    type='button'
                    onClick={() => setIsModalOpen(false)}
                    className='px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer'
                  >
                    Cancelar
                  </button>
                  <button
                    type='button'
                    onClick={handleSaveAndClose}
                    disabled={saveDisabled}
                    className='px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 shadow-md cursor-pointer'
                  >
                    Guardar y Firmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
