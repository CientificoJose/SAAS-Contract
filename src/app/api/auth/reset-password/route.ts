import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/actions';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, code, newPassword } = body;

    const cleanEmail = (email || '').toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Ingresa un correo electrónico válido' }, { status: 400 });
    }

    if (action === 'request') {
      // 1. Check if user exists in Supabase Auth
      const { data: usersData, error: uErr } = await supabaseAdmin.auth.admin.listUsers();
      if (uErr) {
        console.error('Error listing users for reset:', uErr);
        return NextResponse.json({ error: 'Error al verificar el usuario' }, { status: 500 });
      }

      const user = usersData?.users.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (!user) {
        return NextResponse.json({
          success: true,
          message: 'Si el correo está registrado en el sistema, recibirás un código de verificación.'
        });
      }

      // 2. Generate 6-digit numeric OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      // 3. Save to settings table
      const resetKey = `pwd_reset_${cleanEmail}`;
      await supabaseAdmin.from('settings').upsert({
        key: resetKey,
        value: JSON.stringify({
          userId: user.id,
          code: otpCode,
          expiresAt,
          attempts: 0
        })
      });

      // 4. Send email via Nodemailer
      const settings = await getSettings();
      const host = settings.smtp_host || process.env.SMTP_HOST || 'mail.press-cloud.com';
      const portStr = settings.smtp_port || process.env.SMTP_PORT || '465';
      const port = parseInt(portStr);
      const smtpUser = settings.smtp_user || process.env.SMTP_USER || 'contract@press-cloud.com';
      const pass = settings.smtp_pass || process.env.SMTP_PASS || '';
      const brandName = settings.brand_name || 'ContractCloud';
      const primaryColor = settings.color_primary || '#0066FF';
      const from = process.env.SMTP_FROM || settings.smtp_from || `"${brandName}" <${smtpUser}>`;

      if (!host || !smtpUser) {
        throw new Error('Servidor SMTP no configurado para el envío de códigos');
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user: smtpUser, pass },
        tls: { rejectUnauthorized: false }
      });

      await transporter.sendMail({
        from,
        to: cleanEmail,
        subject: `Código de Recuperación: ${otpCode} - ${brandName}`,
        html: `
          <div style="font-family:sans-serif;max-width:550px;margin:0 auto;padding:32px;background:#0d1322;border:1px solid #1e293b;border-radius:16px;color:#f8fafc;">
            <div style="text-align:center;margin-bottom:24px;">
              <h2 style="color:${primaryColor};margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${brandName}</h2>
              <p style="color:#94a3b8;font-size:14px;margin-top:6px;">Recuperación de Contraseña</p>
            </div>
            
            <p style="color:#e2e8f0;font-size:15px;line-height:1.6;">
              Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>${brandName}</strong>.
            </p>
            
            <div style="margin:28px 0;text-align:center;">
              <span style="display:inline-block;padding:16px 36px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#ffffff;background:#030712;border:2px solid ${primaryColor};border-radius:12px;box-shadow:0 0 20px rgba(0,102,255,0.25);">
                ${otpCode}
              </span>
            </div>
            
            <p style="color:#94a3b8;font-size:13px;line-height:1.5;">
              Este código de verificación es válido durante <strong>15 minutos</strong>. Si tú no realizaste esta solicitud, puedes ignorar este mensaje de forma segura.
            </p>
            
            <div style="margin-top:32px;padding-top:16px;border-top:1px solid #1e293b;text-align:center;">
              <p style="color:#64748b;font-size:12px;margin:0;">
                Sistema de Seguridad • ${brandName} • contract.press-cloud.com
              </p>
            </div>
          </div>
        `
      });

      return NextResponse.json({
        success: true,
        message: 'Código de verificación enviado a tu correo electrónico.'
      });
    }

    if (action === 'confirm') {
      if (!code || code.trim().length !== 6) {
        return NextResponse.json({ error: 'Ingresa el código de 6 dígitos' }, { status: 400 });
      }

      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }

      const resetKey = `pwd_reset_${cleanEmail}`;
      const { data: record, error: rErr } = await supabaseAdmin
        .from('settings')
        .select('value')
        .eq('key', resetKey)
        .single();

      if (rErr || !record || !record.value) {
        return NextResponse.json({
          error: 'El código ha expirado o no es válido. Por favor solicita uno nuevo.'
        }, { status: 400 });
      }

      let parsed: { userId: string; code: string; expiresAt: number; attempts: number };
      try {
        parsed = JSON.parse(record.value);
      } catch {
        return NextResponse.json({ error: 'Error al procesar el código' }, { status: 500 });
      }

      if (Date.now() > parsed.expiresAt) {
        await supabaseAdmin.from('settings').delete().eq('key', resetKey);
        return NextResponse.json({
          error: 'El código ha expirado. Por favor solicita uno nuevo.'
        }, { status: 400 });
      }

      if (parsed.attempts >= 5) {
        await supabaseAdmin.from('settings').delete().eq('key', resetKey);
        return NextResponse.json({
          error: 'Demasiados intentos fallidos. Solicita un nuevo código.'
        }, { status: 400 });
      }

      if (parsed.code !== code.trim()) {
        parsed.attempts = (parsed.attempts || 0) + 1;
        await supabaseAdmin.from('settings').update({ value: JSON.stringify(parsed) }).eq('key', resetKey);
        return NextResponse.json({
          error: `Código incorrecto. Te quedan ${5 - parsed.attempts} intentos.`
        }, { status: 400 });
      }

      // Update password in Supabase Auth
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(parsed.userId, {
        password: newPassword
      });

      if (updateErr) {
        console.error('Error updating password:', updateErr);
        return NextResponse.json({
          error: updateErr.message || 'Error al actualizar la contraseña'
        }, { status: 500 });
      }

      // Delete the used token
      await supabaseAdmin.from('settings').delete().eq('key', resetKey);

      return NextResponse.json({
        success: true,
        message: '¡Contraseña restablecida con éxito! Ya puedes iniciar sesión con tu nueva contraseña.'
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: any) {
    console.error('Password reset API error:', err);
    return NextResponse.json({ error: err.message || 'Error en el servidor' }, { status: 500 });
  }
}
