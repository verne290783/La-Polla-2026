import { NextResponse, type NextRequest } from 'next/server';
import { syncRealScores } from '@/lib/scoreSync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');

  // Obtener token Bearer de cabecera de autorización por si se usa en Vercel Cron
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || (secretParam !== expectedSecret && bearerToken !== expectedSecret)) {
    return NextResponse.json(
      { error: 'No autorizado. Se requiere un secret token válido.' },
      { status: 401 }
    );
  }

  try {
    const result = await syncRealScores();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error durante la sincronización cron:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'Error interno del servidor durante la sincronización.' 
      },
      { status: 500 }
    );
  }
}
export async function POST(request: NextRequest) {
  return GET(request);
}
