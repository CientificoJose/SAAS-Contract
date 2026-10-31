import { driver, type DriveStep, type Config } from 'driver.js';

const baseTourConfig: Partial<Config> = {
  showProgress: true,
  animate: true,
  allowClose: true,
  overlayColor: 'rgba(5, 10, 25, 0.75)',
  stagePadding: 8,
  stageRadius: 10,
  nextBtnText: 'Siguiente →',
  prevBtnText: '← Anterior',
  doneBtnText: '¡Entendido!',
  progressText: 'Paso {{current}} de {{total}}'
};

/**
 * Tour 1: Paso a Paso para Crear una Propuesta Comercial
 */
export const proposalCreatorSteps: DriveStep[] = [
  {
    element: '#financial-header-summary',
    popover: {
      title: '⚡ Resumen Financiero en Vivo',
      description:
        'Monitorea en tiempo real el desglose de tu cotización: servicios de <b>Pago Único</b> (desarrollo web, setup) vs <b>Cuotas Recurrentes</b> (hosting, soporte, licencias) y la <b>Inversión Total</b> calculada al instante.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '#section-client-info',
    popover: {
      title: '🏢 Información del Cliente y Facturación',
      description:
        'Ingresa los datos de la empresa, nombre del representante y correo del cliente. Este correo se utilizará para vincular la <b>Firma Digital</b> y enviar notificaciones automáticas.',
      side: 'top',
      align: 'start'
    }
  },
  {
    element: '#section-proposal-branding',
    popover: {
      title: '🎨 Personalización de Marca (Branding)',
      description:
        'Personaliza el logotipo y la paleta de colores con los que el cliente verá su portal privado. Si no subes ninguno, se utilizarán automáticamente los colores corporativos de tu empresa.',
      side: 'top',
      align: 'start'
    }
  },
  {
    element: '#section-services-list',
    popover: {
      title: '📦 Catálogo de Servicios y Modelo de Cobro',
      description:
        'Añade los servicios solicitados. Elige entre <b>[⚡ Pago Único]</b> para proyectos puntuales o <b>[🔄 Recurrente]</b> para suscripciones periódicas. El sistema calculará automáticamente la fecha de vencimiento y renovación.',
      side: 'top',
      align: 'start'
    }
  },
  {
    element: '#section-payment-schedule',
    popover: {
      title: '💳 Esquema de Cuotas de Pago',
      description:
        'Define el modelo de cobranza: <b>100% Contado</b>, <b>50% Anticipo / 50% Entrega</b> o agrega cuotas personalizadas con sus respectivas fechas límites de pago.',
      side: 'top',
      align: 'start'
    }
  },
  {
    element: '#section-credentials',
    popover: {
      title: '🔐 Bóveda de Accesos y Credenciales',
      description:
        'Si el proyecto incluye accesos a CPanel, WordPress o servidores, puedes agregarlos aquí. <b>Permanecerán cifrados</b> y solo se revelarán al cliente de forma segura cuando el contrato esté debidamente firmado.',
      side: 'top',
      align: 'start'
    }
  },
  {
    element: '#btn-submit-proposal',
    popover: {
      title: '🚀 Publicar y Generar Contrato Digital',
      description:
        'Haz clic aquí para crear la propuesta en el sistema. Se generará un enlace único <b>/p/[id]</b> interactivo y seguro listo para compartir con el cliente.',
      side: 'top',
      align: 'end'
    }
  }
];

/**
 * Tour 2: Historial de Propuestas & 7 Acciones de la Tabla
 */
export const contractsDashboardSteps: DriveStep[] = [
  {
    element: '#dashboard-kpi-summary',
    popover: {
      title: '📊 Métricas Clave del Negocio',
      description:
        'Visualiza de un vistazo tus contratos activos, la facturación global en USD, los contratos cobrados al 100% y los pagos pendientes o en renovación.',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#dashboard-tabs-nav',
    popover: {
      title: '🗂️ Módulos de Gestión',
      description:
        'Navega entre tus <b>Propuestas</b>, el <b>Catálogo de Servicios y Planes</b>, la personalización de tu <b>Marca / SMTP</b> y los <b>Métodos de Pago</b> (Transferencias, Binance, Zelle).',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '#btn-create-proposal-main',
    popover: {
      title: '➕ Crear Nueva Propuesta',
      description:
        'Acceso directo para presupuestar, cotizar y emitir un nuevo contrato comercial para tus clientes.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '#dashboard-search-bar',
    popover: {
      title: '🔍 Búsqueda Rápida de Contratos',
      description:
        'Filtra en tiempo real por nombre de cliente, empresa, dominio web o identificador de factura (ej: <code>FAC-2026-XXX</code>).',
      side: 'bottom',
      align: 'start'
    }
  },
  {
    element: '#contracts-table-header-type',
    popover: {
      title: '🏷️ Modalidad de Cobro & Vencimiento',
      description:
        'Los badges indican si el contrato es de <b>PAGO ÚNICO</b>, <b>RECURRENTE</b> o <b>MIXTO</b>. En los recurrentes, verás en morado la <b>Próxima Fecha de Renovación</b>.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '#contracts-table-header-status',
    popover: {
      title: '🚦 Semáforo de Estados de Cobro',
      description:
        'Controla el estado financiero:<br>• <b>VIGENTE (Verde):</b> Totalmente pagado y al día.<br>• <b>RENOVACIÓN PENDIENTE (Ámbar):</b> Período concluido y cuota generada pendiente de pago.<br>• <b>PARCIAL:</b> Anticipo recibido.<br>• <b>PENDIENTE:</b> Esperando cobro inicial.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '#first-row-actions, #actions-column-tour',
    popover: {
      title: '⚡ 7 Acciones Clave por Contrato',
      description:
        'Cada contrato cuenta con herramientas operativas rápidas:<br><br>' +
        '1. <b>🌐 Abrir Portal:</b> Abre la vista interactiva del cliente (<code>/p/[id]</code>).<br>' +
        '2. <b>🔄 Renovar Período:</b> Genera el siguiente ciclo recurrente con monto exacto.<br>' +
        '3. <b>💳 Registrar Pago:</b> Cobra cuotas o renovaciones para volver a estado <b>VIGENTE</b>.<br>' +
        '4. <b>👁️ Ver Detalles:</b> Desglose de servicios, pagos y credenciales seguras.<br>' +
        '5. <b>✉️ Enviar Correo:</b> Envía el contrato directo al cliente vía SMTP.<br>' +
        '6. <b>📋 Copiar Enlace:</b> Copia el link para enviarlo por WhatsApp o chat.<br>' +
        '7. <b>🗑️ Eliminar:</b> Borra el contrato tras confirmación de seguridad.',
      side: 'left',
      align: 'center'
    }
  }
];

export function startProposalCreatorTour() {
  if (typeof window === 'undefined') return;
  const driverObj = driver({
    ...baseTourConfig,
    steps: proposalCreatorSteps
  });
  driverObj.drive();
}

export function startContractsDashboardTour() {
  if (typeof window === 'undefined') return;
  const driverObj = driver({
    ...baseTourConfig,
    steps: contractsDashboardSteps
  });
  driverObj.drive();
}
