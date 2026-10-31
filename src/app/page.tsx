import Link from 'next/link';
import { Icons } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'ContractCloud — Propuestas Comerciales, Firma Digital y Cobros Recurrentes',
  description:
    'La plataforma moderna para agencias y consultores. Crea propuestas interactivas con firma digital, gestiona pagos únicos y suscripciones recurrentes, y ofrece un portal VIP a tus clientes.'
};

export default function LandingPage() {
  return (
    <div className='min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary'>
      {/* ======================================================== */}
      {/* NAVBAR */}
      {/* ======================================================== */}
      <header className='sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between'>
          <Link href='/' className='flex items-center gap-2.5 group'>
            <div className='h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-md group-hover:scale-105 transition-transform'>
              C
            </div>
            <div className='flex flex-col'>
              <span className='font-black text-base tracking-tight leading-none'>
                ContractCloud
              </span>
              <span className='text-[10px] text-muted-foreground font-medium'>
                SaaS Comercial & Contratos
              </span>
            </div>
          </Link>

          <nav className='hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground'>
            <a href='#caracteristicas' className='hover:text-foreground transition-colors'>
              Características
            </a>
            <a href='#como-funciona' className='hover:text-foreground transition-colors'>
              Cómo Funciona
            </a>
            <a
              href='#pricing'
              className='hover:text-foreground transition-colors flex items-center gap-1.5'
            >
              <span>Planes</span>
              <span className='text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20'>
                $15/mes
              </span>
            </a>
            <a href='#preguntas' className='hover:text-foreground transition-colors'>
              Preguntas Frecuentes
            </a>
          </nav>

          <div className='flex items-center gap-3'>
            <Link href='/login'>
              <Button
                variant='outline'
                size='sm'
                className='font-semibold text-xs h-9 cursor-pointer'
              >
                Iniciar Sesión
              </Button>
            </Link>
            <Link href='/login'>
              <Button
                size='sm'
                className='font-bold text-xs h-9 cursor-pointer shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground'
              >
                <span>Comenzar</span>
                <Icons.arrowRight className='h-3.5 w-3.5 ml-1' />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* HERO SECTION */}
      {/* ======================================================== */}
      <section className='relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border/40'>
        {/* Glow ambient background */}
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-primary/10 blur-[120px] pointer-events-none -z-10 rounded-full' />

        <div className='max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6'>
          <div className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-semibold shadow-xs'>
            <Icons.sparkles className='h-3.5 w-3.5 text-primary animate-pulse' />
            <span>Cobros Recurrentes + Pagos Únicos Automatizados</span>
          </div>

          <h1 className='text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-balance'>
            Cierra Contratos en Minutos y Automatiza tus{' '}
            <span className='bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent'>
              Cobros Recurrentes
            </span>
          </h1>

          <p className='text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance'>
            Dile adiós a los PDFs estáticos. Envía propuestas interactivas con firma digital
            vinculante, cobra anticipos y mensualidades, y entrega accesos en un portal VIP con tu
            propia marca.
          </p>

          <div className='flex flex-col sm:flex-row items-center justify-center gap-3 pt-2'>
            <Link href='/login' className='w-full sm:w-auto'>
              <Button
                size='lg'
                className='w-full sm:w-auto font-bold text-sm h-11 px-8 cursor-pointer shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground'
              >
                <span>Comenzar Ahora — $15/mes</span>
                <Icons.arrowRight className='h-4 w-4 ml-1.5' />
              </Button>
            </Link>
            <a href='#demo-preview' className='w-full sm:w-auto'>
              <Button
                variant='outline'
                size='lg'
                className='w-full sm:w-auto font-medium text-sm h-11 px-6 cursor-pointer'
              >
                <Icons.eye className='h-4 w-4 mr-2 text-muted-foreground' />
                <span>Ver Demo en Vivo</span>
              </Button>
            </a>
          </div>

          {/* Social Proof / Pillars */}
          <div className='pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-muted-foreground border-t border-border/40 max-w-3xl mx-auto'>
            <div className='flex items-center justify-center gap-1.5'>
              <Icons.circleCheck className='h-4 w-4 text-emerald-500' />
              <span>Firma Digital Vinculante</span>
            </div>
            <div className='flex items-center justify-center gap-1.5'>
              <Icons.circleCheck className='h-4 w-4 text-emerald-500' />
              <span>Gestión Dual de Cobro</span>
            </div>
            <div className='flex items-center justify-center gap-1.5'>
              <Icons.circleCheck className='h-4 w-4 text-emerald-500' />
              <span>Portal VIP para Clientes</span>
            </div>
            <div className='flex items-center justify-center gap-1.5'>
              <Icons.circleCheck className='h-4 w-4 text-emerald-500' />
              <span>Credenciales Seguras</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* INTERACTIVE MOCKUP PREVIEW */}
        {/* ======================================================== */}
        <div id='demo-preview' className='max-w-4xl mx-auto px-4 sm:px-6 mt-12'>
          <div className='rounded-2xl border border-border/60 bg-card p-2 sm:p-4 shadow-2xl relative overflow-hidden'>
            {/* Mockup browser bar */}
            <div className='flex items-center justify-between pb-3 px-2 border-b border-border/40 text-xs text-muted-foreground'>
              <div className='flex items-center gap-1.5'>
                <div className='w-2.5 h-2.5 rounded-full bg-red-500/80' />
                <div className='w-2.5 h-2.5 rounded-full bg-amber-500/80' />
                <div className='w-2.5 h-2.5 rounded-full bg-emerald-500/80' />
                <span className='ml-2 font-mono text-[11px] text-muted-foreground/70 hidden sm:inline'>
                  contract.press-cloud.com/p/FAC-2026-108
                </span>
              </div>
              <Badge
                variant='outline'
                className='text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
              >
                ● Portal Comercial Activo
              </Badge>
            </div>

            {/* Mockup inner proposal preview */}
            <div className='p-4 sm:p-6 space-y-4 bg-muted/10 rounded-xl mt-2'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4'>
                <div>
                  <span className='text-[10px] font-black tracking-wider uppercase text-primary'>
                    Propuesta Comercial & Contrato
                  </span>
                  <h3 className='text-lg sm:text-xl font-bold'>
                    Desarrollo Plataforma Web + Mantenimiento Cloud
                  </h3>
                  <p className='text-xs text-muted-foreground'>
                    Cliente: Inversiones GlobalTech C.A. • #FAC-2026-108
                  </p>
                </div>
                <div className='text-left sm:text-right'>
                  <div className='text-xl sm:text-2xl font-black text-foreground'>
                    $1,450.00 <span className='text-xs font-normal text-muted-foreground'>USD</span>
                  </div>
                  <div className='text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold'>
                    $1,200 Único + $250/mes Recurrente
                  </div>
                </div>
              </div>

              {/* Services list mockup */}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'>
                <div className='p-3 rounded-lg border border-border/50 bg-background/50 space-y-1'>
                  <div className='flex items-center justify-between'>
                    <span className='font-bold'>Diseño & Desarrollo Frontend</span>
                    <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20'>
                      Pago Único
                    </span>
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    Arquitectura Next.js 16, interfaz responsiva y SEO optimizado.
                  </p>
                  <div className='font-mono font-bold text-foreground pt-1'>$1,200.00 USD</div>
                </div>

                <div className='p-3 rounded-lg border border-border/50 bg-background/50 space-y-1'>
                  <div className='flex items-center justify-between'>
                    <span className='font-bold'>Hosting Cloud & Soporte VIP</span>
                    <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-500 border border-purple-500/20'>
                      Recurrente (Mensual)
                    </span>
                  </div>
                  <p className='text-[11px] text-muted-foreground'>
                    Backups diarios, monitoreo 24/7 y renovaciones automáticas.
                  </p>
                  <div className='font-mono font-bold text-foreground pt-1'>$250.00 USD / mes</div>
                </div>
              </div>

              {/* Digital signature banner mockup */}
              <div className='p-3.5 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
                <div className='flex items-center gap-2.5'>
                  <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0'>
                    <Icons.circleCheck className='h-4 w-4' />
                  </div>
                  <div>
                    <div className='font-bold text-xs'>Contrato Formalizado con Firma Digital</div>
                    <div className='text-[11px] text-muted-foreground'>
                      Firmado por Carlos Rodríguez (Director de Operaciones)
                    </div>
                  </div>
                </div>
                <Link href='/login'>
                  <Button size='sm' className='h-8 text-xs font-bold cursor-pointer'>
                    Probar en mi Agencia
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FEATURES SECTION */}
      {/* ======================================================== */}
      <section
        id='caracteristicas'
        className='py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12'
      >
        <div className='text-center max-w-3xl mx-auto space-y-4'>
          <Badge
            variant='outline'
            className='text-primary border-primary/30 bg-primary/5 text-xs font-bold'
          >
            Todo lo que tu Agencia Necesita
          </Badge>
          <h2 className='text-3xl sm:text-4xl font-black tracking-tight'>
            Diseñado para Cerrar Clientes y Mantener Ingresos Recurrentes
          </h2>
          <p className='text-muted-foreground text-sm sm:text-base'>
            ContractCloud unifica el ciclo de ventas comercial completo: cotización, firma digital,
            pagos y entrega de servicios.
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {/* Feature 1 */}
          <Card className='border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/50 transition-all'>
            <CardHeader className='space-y-3'>
              <div className='h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold'>
                <Icons.page className='h-5 w-5' />
              </div>
              <CardTitle className='text-lg font-bold'>Propuestas Interactivas</CardTitle>
              <CardDescription className='text-xs leading-relaxed'>
                Envía un enlace interactivo optimizado para móviles y computadoras. Personaliza con
                tu logo y los colores corporativos de tu marca.
              </CardDescription>
            </CardHeader>
            <CardFooter className='pt-0 text-[11px] font-semibold text-primary'>
              Sin PDFs pesados ni desconfigurados →
            </CardFooter>
          </Card>

          {/* Feature 2 */}
          <Card className='border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/50 transition-all'>
            <CardHeader className='space-y-3'>
              <div className='h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold'>
                <Icons.calendarPlus className='h-5 w-5' />
              </div>
              <CardTitle className='text-lg font-bold'>Suscripciones & Renovación</CardTitle>
              <CardDescription className='text-xs leading-relaxed'>
                Combina servicios de Pago Único (setup, desarrollo) y Recurrentes (hosting,
                retainer). Al renovar, el sistema cobra solo la cuota periódica sin duplicar costos.
              </CardDescription>
            </CardHeader>
            <CardFooter className='pt-0 text-[11px] font-semibold text-purple-500'>
              Renovación en 1 clic →
            </CardFooter>
          </Card>

          {/* Feature 3 */}
          <Card className='border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/50 transition-all'>
            <CardHeader className='space-y-3'>
              <div className='h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold'>
                <Icons.circleCheck className='h-5 w-5' />
              </div>
              <CardTitle className='text-lg font-bold'>Firma Digital Segura</CardTitle>
              <CardDescription className='text-xs leading-relaxed'>
                El cliente firma con el dedo en el móvil o con el ratón en la computadora. Queda
                sellada con estampa de tiempo y auditoría legal inmediata.
              </CardDescription>
            </CardHeader>
            <CardFooter className='pt-0 text-[11px] font-semibold text-emerald-500'>
              Validez inmediata →
            </CardFooter>
          </Card>

          {/* Feature 4 */}
          <Card className='border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/50 transition-all'>
            <CardHeader className='space-y-3'>
              <div className='h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold'>
                <Icons.lock className='h-5 w-5' />
              </div>
              <CardTitle className='text-lg font-bold'>Bóveda de Credenciales</CardTitle>
              <CardDescription className='text-xs leading-relaxed'>
                Asigna accesos a CPanel, CMS o licencias confidenciales. Se mantienen protegidos y
                solo se revelan automáticamente cuando el contrato se firma.
              </CardDescription>
            </CardHeader>
            <CardFooter className='pt-0 text-[11px] font-semibold text-amber-500'>
              Entrega segura de accesos →
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* ======================================================== */}
      {/* HOW IT WORKS */}
      {/* ======================================================== */}
      <section id='como-funciona' className='py-20 border-t border-border/40 bg-muted/10'>
        <div className='max-w-5xl mx-auto px-4 sm:px-6 space-y-12'>
          <div className='text-center space-y-3'>
            <Badge variant='outline' className='text-xs font-bold'>
              Flujo Simple en 3 Pasos
            </Badge>
            <h2 className='text-3xl font-black'>¿Cómo funciona ContractCloud?</h2>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            <div className='space-y-3 text-center md:text-left'>
              <div className='w-12 h-12 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center mx-auto md:mx-0 shadow-md'>
                1
              </div>
              <h3 className='font-bold text-base'>Crea tu Propuesta</h3>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Selecciona tus servicios del catálogo, ajusta precios, elige el modelo de cobro
                (único o recurrente) y define las condiciones de pago.
              </p>
            </div>

            <div className='space-y-3 text-center md:text-left'>
              <div className='w-12 h-12 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center mx-auto md:mx-0 shadow-md'>
                2
              </div>
              <h3 className='font-bold text-base'>Comparte el Enlace Interactivo</h3>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Envía el enlace por WhatsApp o email. El cliente revisa los términos, firma
                digitalmente desde cualquier dispositivo y realiza su pago.
              </p>
            </div>

            <div className='space-y-3 text-center md:text-left'>
              <div className='w-12 h-12 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center mx-auto md:mx-0 shadow-md'>
                3
              </div>
              <h3 className='font-bold text-base'>Cobra y Renueva en Piloto Automático</h3>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Monitorea qué contratos están vigentes, recibe reportes de abonos y genera
                renovaciones periódicas sin tener que volver a cotizar desde cero.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* PRICING SECTION */}
      {/* ======================================================== */}
      <section
        id='pricing'
        className='py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12'
      >
        <div className='text-center max-w-2xl mx-auto space-y-4'>
          <Badge className='bg-primary/10 text-primary border-primary/20 text-xs font-bold'>
            Precios Claros y Transparentes
          </Badge>
          <h2 className='text-3xl sm:text-4xl font-black tracking-tight'>
            Un Solo Plan con Todo Incluido para Escalar
          </h2>
          <p className='text-muted-foreground text-sm'>
            Sin comisiones ocultas ni límites artificiales de clientes. Todo lo que necesitas para
            tu agencia.
          </p>
        </div>

        <div className='max-w-lg mx-auto'>
          <Card className='border-2 border-primary shadow-2xl relative overflow-hidden bg-card'>
            <div className='absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs'>
              🔥 Plan Recomendado
            </div>

            <CardHeader className='space-y-2 pb-6'>
              <CardTitle className='text-2xl font-black'>Plan Pro Agencia & Consultoría</CardTitle>
              <CardDescription className='text-xs'>
                Ideal para agencias de desarrollo, diseño, marketing digital, freelancers y
                profesionales independientes.
              </CardDescription>

              <div className='pt-4 flex items-baseline gap-1'>
                <span className='text-5xl font-black tracking-tight'>$15</span>
                <span className='text-sm font-semibold text-muted-foreground'>USD / mes</span>
              </div>
            </CardHeader>

            <CardContent className='space-y-3.5 border-t border-border/40 pt-6 text-xs'>
              <div className='flex items-center gap-2.5 font-medium'>
                <Icons.circleCheck className='h-4 w-4 text-emerald-500 shrink-0' />
                <span>Propuestas comerciales y contratos ilimitados</span>
              </div>
              <div className='flex items-center gap-2.5 font-medium'>
                <Icons.circleCheck className='h-4 w-4 text-emerald-500 shrink-0' />
                <span>Firma digital vinculante integrada (móvil y web)</span>
              </div>
              <div className='flex items-center gap-2.5 font-medium'>
                <Icons.circleCheck className='h-4 w-4 text-emerald-500 shrink-0' />
                <span>Gestión dual: Pagos Únicos y Servicios Recurrentes</span>
              </div>
              <div className='flex items-center gap-2.5 font-medium'>
                <Icons.circleCheck className='h-4 w-4 text-emerald-500 shrink-0' />
                <span>Renovaciones periódicas automatizadas en 1 clic</span>
              </div>
              <div className='flex items-center gap-2.5 font-medium'>
                <Icons.circleCheck className='h-4 w-4 text-emerald-500 shrink-0' />
                <span>Portal VIP para clientes con tu logotipo y colores</span>
              </div>
              <div className='flex items-center gap-2.5 font-medium'>
                <Icons.circleCheck className='h-4 w-4 text-emerald-500 shrink-0' />
                <span>Bóveda de credenciales de acceso privadas (CPanel, CMS)</span>
              </div>
              <div className='flex items-center gap-2.5 font-medium'>
                <Icons.circleCheck className='h-4 w-4 text-emerald-500 shrink-0' />
                <span>Configuración de métodos de pago (Zelle, Binance Pay, Bancos)</span>
              </div>
              <div className='flex items-center gap-2.5 font-medium'>
                <Icons.circleCheck className='h-4 w-4 text-emerald-500 shrink-0' />
                <span>Notificaciones por correo electrónico y botón WhatsApp</span>
              </div>
            </CardContent>

            <CardFooter className='pt-4 pb-6'>
              <Link href='/login' className='w-full'>
                <Button
                  size='lg'
                  className='w-full font-bold text-sm h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg cursor-pointer'
                >
                  <span>Acceder al Sistema</span>
                  <Icons.arrowRight className='h-4 w-4 ml-1.5' />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FAQ SECTION */}
      {/* ======================================================== */}
      <section id='preguntas' className='py-20 border-t border-border/40 bg-muted/10'>
        <div className='max-w-3xl mx-auto px-4 sm:px-6 space-y-8'>
          <div className='text-center space-y-3'>
            <Badge variant='outline' className='text-xs font-bold'>
              FAQ
            </Badge>
            <h2 className='text-3xl font-black'>Preguntas Frecuentes</h2>
          </div>

          <div className='space-y-4 text-xs sm:text-sm'>
            <div className='p-4 rounded-xl border border-border/50 bg-background space-y-1.5'>
              <h4 className='font-bold text-foreground text-sm'>
                ¿Reemplaza completamente los contratos en PDF?
              </h4>
              <p className='text-muted-foreground leading-relaxed'>
                Sí. Tus clientes reciben un enlace interactivo optimizado donde pueden leer, auditar
                y firmar en segundos. Además, si lo desean, tanto tú como tu cliente pueden exportar
                e imprimir el contrato en PDF formal con un solo clic.
              </p>
            </div>

            <div className='p-4 rounded-xl border border-border/50 bg-background space-y-1.5'>
              <h4 className='font-bold text-foreground text-sm'>
                ¿Cómo funciona el cobro de servicios recurrentes?
              </h4>
              <p className='text-muted-foreground leading-relaxed'>
                Al crear la propuesta puedes elegir qué servicios son de pago único (ej. diseño web)
                y cuáles recurrentes (ej. hosting o soporte mensual). Al momento de renovar el
                ciclo, el sistema genera la cuota únicamente sobre los servicios recurrentes sin
                volver a cobrar el setup inicial.
              </p>
            </div>

            <div className='p-4 rounded-xl border border-border/50 bg-background space-y-1.5'>
              <h4 className='font-bold text-foreground text-sm'>
                ¿Es segura la entrega de credenciales?
              </h4>
              <p className='text-muted-foreground leading-relaxed'>
                Totalmente. Las contraseñas de hosting o accesos administrativos se mantienen
                protegidas en el backend y solo se revelan en el portal del cliente una vez que la
                firma digital ha sido completada y registrada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* FOOTER */}
      {/* ======================================================== */}
      <footer className='border-t border-border/40 py-10 bg-background'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <div className='h-6 w-6 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-xs'>
              C
            </div>
            <span className='font-bold text-foreground'>ContractCloud</span>
            <span>• Plataforma SaaS para Propuestas Comerciales</span>
          </div>

          <div className='flex items-center gap-6 font-medium'>
            <Link href='/login' className='hover:text-foreground transition-colors'>
              Iniciar Sesión
            </Link>
            <Link href='/dashboard' className='hover:text-foreground transition-colors'>
              Dashboard
            </Link>
          </div>

          <div>© {new Date().getFullYear()} ContractCloud. Todos los derechos reservados.</div>
        </div>
      </footer>
    </div>
  );
}
