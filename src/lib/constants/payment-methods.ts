import type { PaymentMethodConfig } from '@/lib/supabase/types';

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'pm-zelle',
    name: 'Zelle',
    type: 'zelle',
    logo_url: '/logos/zelle.svg',
    enabled: true,
    account_email: 'pagos@agencia.com',
    account_holder: 'Agencia Digital',
    instructions: 'Coloca el número de propuesta o factura en la nota o memo de la transferencia.'
  },
  {
    id: 'pm-binance',
    name: 'Binance Pay / USDT',
    type: 'binance',
    logo_url: '/logos/binance.svg',
    enabled: true,
    binance_id: '84920193',
    network: 'USDT (Red TRC-20)',
    wallet_address: 'TXyz1234567890abcdefghijklmnopqrstuv',
    instructions: 'Enviar mediante Binance Pay ID sin comisiones o transferencia directa USDT TRC-20.'
  },
  {
    id: 'pm-bank',
    name: 'Transferencia Bancaria',
    type: 'bank_transfer',
    logo_url: '/logos/bank.svg',
    enabled: true,
    bank_name: 'Banco Nacional / Internacional',
    account_holder: 'Agencia Digital C.A.',
    account_number: '0134-0000-00-0000000000',
    routing_number: 'J-12345678-0',
    instructions: 'Enviar el comprobante de pago emitido por el banco al correo corporativo.'
  }
];
