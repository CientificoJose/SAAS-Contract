import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const cleanName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `uploads/${cleanName}`;

    const { error } = await supabaseAdmin.storage
      .from('contract-assets')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json(
        { error: error.message || 'Error al subir archivo a Supabase Storage' },
        { status: 500 }
      );
    }

    const { data: pubUrl } = supabaseAdmin.storage
      .from('contract-assets')
      .getPublicUrl(filePath);

    return NextResponse.json({ url: pubUrl.publicUrl }, { status: 200 });
  } catch (err: any) {
    console.error('API upload route error:', err);
    return NextResponse.json(
      { error: err.message || 'Error al procesar la subida' },
      { status: 500 }
    );
  }
}
